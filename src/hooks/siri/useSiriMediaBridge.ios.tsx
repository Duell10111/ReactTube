import {MutableRefObject, useEffect, useRef} from "react";
import {Platform} from "react-native";

import SiriMedia, {
  SiriMediaRequest,
  SiriMediaResult,
} from "../../../modules/siri-media";

import {useAppData} from "@/context/AppDataContext";
import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {useYoutubeContext} from "@/context/YoutubeContext";
import {RootStackParamList} from "@/navigation/RootStackNavigator";
import {navigationRef} from "@/navigation/navigationRef";
import {getLastPlayedTrack, setLastPlayedTrack} from "@/siri/lastPlayedTrack";
import {parseSiriRequest, SiriSearchRequest} from "@/siri/parseSiriRequest";
import {resolveSiriRequest} from "@/siri/resolveSiriRequest";
import {isSiriRequestExpired} from "@/siri/siriRequestDeadline";
import Logger from "@/utils/Logger";
import {setupMusicPlayer} from "@/utils/music/MusicInit";

const LOGGER = Logger.extend("SIRI");

/** How long a cold start may take until YouTube or navigation is usable. */
const YOUTUBE_WAIT_MS = 6000;
const NAVIGATION_WAIT_MS = 15000;

interface BridgeRefs {
  youtube: ReturnType<typeof useYoutubeContext>;
  player: ReturnType<typeof useMusikPlayerContext>;
  playbackEnabled: boolean;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface Completion {
  title?: string;
  artist?: string;
  /** Why the request ended this way; goes to the system log. */
  detail?: string;
}

function complete(
  request: SiriMediaRequest,
  result: SiriMediaResult,
  {title, artist, detail}: Completion = {},
) {
  // receivedAt comes from the native clock with sub-millisecond precision.
  const elapsed = Math.max(0, Math.round(Date.now() - request.receivedAt));
  const message = `${request.requestId} -> ${result} after ${elapsed} ms${detail ? ` (${detail})` : ""}`;
  if (result === "success") {
    LOGGER.info(message);
  } else {
    LOGGER.warn(message);
  }
  SiriMedia?.completeRequest(
    request.requestId,
    result,
    title,
    artist,
    detail ? `${detail}, ${elapsed} ms` : `${elapsed} ms`,
  );
}

/**
 * Siri gave up already (cold start or YouTube too slow): answering is
 * pointless and playback would start unexpectedly.
 */
function abortIfExpired(request: SiriMediaRequest, stage: string) {
  if (!isSiriRequestExpired(request)) {
    return false;
  }
  complete(request, "failure", {detail: `expired before ${stage}`});
  return true;
}

async function waitForYoutube(refs: MutableRefObject<BridgeRefs>) {
  const deadline = Date.now() + YOUTUBE_WAIT_MS;
  while (!refs.current.youtube && Date.now() < deadline) {
    await delay(100);
  }
  return refs.current.youtube;
}

/**
 * Waits until the root navigator offers the route. After a cold start it only
 * registers the screens once the app finished initializing.
 */
async function waitForRoute(route: keyof RootStackParamList) {
  const deadline = Date.now() + NAVIGATION_WAIT_MS;
  while (Date.now() < deadline) {
    if (
      navigationRef.isReady() &&
      navigationRef.getRootState()?.routeNames?.includes(route)
    ) {
      return true;
    }
    await delay(200);
  }
  return false;
}

async function openSearch(request: SiriSearchRequest) {
  const route = request.target === "video" ? "Search" : "MusicSearchScreen";
  if (!(await waitForRoute(route))) {
    return false;
  }
  navigationRef.navigate(route, {initialQuery: request.query});
  return true;
}

async function handleRequest(
  request: SiriMediaRequest,
  refs: MutableRefObject<BridgeRefs>,
) {
  // The extension already refuses while disabled; this covers requests that
  // were queued before the setting changed.
  if (!refs.current.playbackEnabled) {
    complete(request, "failure", {detail: "Siri playback disabled"});
    if (
      request.delivery === "continueInApp" &&
      (await waitForRoute("SettingsScreen"))
    ) {
      // Siri opened the app because Siri playback is off; show the switch.
      navigationRef.navigate("SettingsScreen", {screen: "SiriSettings"});
    }
    return;
  }

  const parsed = parseSiriRequest(request);
  LOGGER.info(
    `${request.requestId} ${request.source} ${request.delivery} ${parsed.kind}`,
    parsed,
  );

  if (parsed.kind === "search") {
    const opened = await openSearch(parsed);
    complete(request, opened ? "success" : "failure", {
      detail: opened ? "search opened" : "navigation not ready",
    });
    return;
  }

  const youtube = await waitForYoutube(refs);
  if (!youtube) {
    complete(request, "failure", {detail: "YouTube not ready"});
    return;
  }
  if (abortIfExpired(request, "search")) {
    return;
  }

  const {player} = refs.current;
  const resolution = await resolveSiriRequest(youtube, parsed, {
    hasCurrentItem: !!player.currentItem,
    lastPlayed: getLastPlayedTrack(),
  });
  if (resolution.kind === "notFound") {
    complete(request, "notFound", {detail: `nothing found for ${parsed.kind}`});
    return;
  }
  if (abortIfExpired(request, "playback")) {
    return;
  }

  // Normally done in index.js; repeated here (idempotent) because playback
  // must not depend on the order in which a headless start runs modules.
  if (!setupMusicPlayer()) {
    complete(request, "failure", {detail: "music player setup failed"});
    return;
  }

  if (resolution.kind === "resume") {
    player.play();
    complete(request, "success", {
      title: player.currentItem?.title,
      artist: player.currentItem?.author?.name,
      detail: "resumed",
    });
    return;
  }

  // Only the mini player appears; the current screen stays.
  player.setPlaylistViaEndpoint(resolution.endpoint);
  complete(request, "success", {
    title: resolution.title,
    artist: resolution.artist,
    detail: parsed.kind,
  });
}

export default function useSiriMediaBridge() {
  const youtube = useYoutubeContext();
  const player = useMusikPlayerContext();
  const {appSettings} = useAppData();
  const playbackEnabled = !!appSettings.siriPlaybackEnabled;
  const donationsEnabled = !!appSettings.siriDonationsEnabled;

  const refs = useRef<BridgeRefs>({youtube, player, playbackEnabled});
  refs.current = {youtube, player, playbackEnabled};

  // The intents extension answers before the app runs and reads the setting
  // from the app group.
  useEffect(() => {
    if (!SiriMedia || Platform.isTV) {
      return;
    }
    SiriMedia.setPlaybackEnabled(playbackEnabled);
  }, [playbackEnabled]);

  useEffect(() => {
    if (!SiriMedia || Platform.isTV) {
      return;
    }
    const onRequest = (request: SiriMediaRequest) => {
      handleRequest(request, refs).catch(error => {
        complete(request, "failure", {
          detail: `exception: ${error instanceof Error ? error.message : String(error)}`,
        });
      });
    };
    const subscription = SiriMedia.addListener("onSiriMediaRequest", onRequest);
    SiriMedia.getPendingRequests().forEach(onRequest);
    return () => subscription.remove();
  }, []);

  const {currentItem, playing} = player;

  // Remembered independently of donations: it stays on the device and only
  // serves "resume ReactTube" after a cold start.
  useEffect(() => {
    if (!SiriMedia || Platform.isTV || !playing || !currentItem) {
      return;
    }
    setLastPlayedTrack({
      videoId: currentItem.id,
      title: currentItem.title,
      artist: currentItem.author?.name,
    });
  }, [currentItem, playing]);

  // Donate each track once it actually plays, so Siri learns ReactTube as a
  // media app and resolves it even while the app is not running.
  const lastDonatedId = useRef<string>(undefined);
  useEffect(() => {
    if (
      !SiriMedia ||
      Platform.isTV ||
      !donationsEnabled ||
      !playing ||
      !currentItem ||
      lastDonatedId.current === currentItem.id
    ) {
      return;
    }
    lastDonatedId.current = currentItem.id;
    SiriMedia.donatePlayback(
      currentItem.id,
      currentItem.title,
      currentItem.author?.name,
    );
  }, [currentItem, playing, donationsEnabled]);
}
