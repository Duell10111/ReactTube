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
import Logger from "@/utils/Logger";

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

function complete(
  requestId: string,
  result: SiriMediaResult,
  title?: string,
  artist?: string,
) {
  SiriMedia?.completeRequest(requestId, result, title, artist);
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
    complete(request.requestId, "failure");
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
  LOGGER.info(`${request.delivery} ${parsed.kind}`, parsed);

  if (parsed.kind === "search") {
    const opened = await openSearch(parsed);
    complete(request.requestId, opened ? "success" : "failure");
    return;
  }

  const youtube = await waitForYoutube(refs);
  if (!youtube) {
    complete(request.requestId, "failure");
    return;
  }

  const {player} = refs.current;
  const resolution = await resolveSiriRequest(youtube, parsed, {
    hasCurrentItem: !!player.currentItem,
    lastPlayed: getLastPlayedTrack(),
  });

  switch (resolution.kind) {
    case "resume":
      player.play();
      complete(
        request.requestId,
        "success",
        player.currentItem?.title,
        player.currentItem?.author?.name,
      );
      break;
    case "play":
      // Only the mini player appears; the current screen stays.
      player.setPlaylistViaEndpoint(resolution.endpoint);
      complete(
        request.requestId,
        "success",
        resolution.title,
        resolution.artist,
      );
      break;
    case "notFound":
      complete(request.requestId, "notFound");
      break;
  }
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
        LOGGER.warn(`Siri request ${request.requestId} failed`, error);
        complete(request.requestId, "failure");
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
