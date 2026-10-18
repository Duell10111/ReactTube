import {MutableRefObject, useEffect, useRef} from "react";
import {Platform} from "react-native";

import SiriMedia, {
  SiriMediaRequest,
  SiriMediaResult,
} from "../../../modules/siri-media";

import {useAppData} from "@/context/AppDataContext";
import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {useYoutubeContext, useYoutubeTVContext} from "@/context/YoutubeContext";
import {getPlaylistAsYTPlaylist} from "@/downloader/DBData";
import type {VideoData} from "@/extraction/Types";
import usePlaylistManager from "@/hooks/playlist/usePlaylistManager";
import {loadSiriLibrary} from "@/hooks/siri/siriLibrary";
import {RootStackParamList} from "@/navigation/RootStackNavigator";
import {navigationRef} from "@/navigation/navigationRef";
import {getLastPlayedTrack, setLastPlayedTrack} from "@/siri/lastPlayedTrack";
import {findSiriLibraryPlaylist, SiriLibrary} from "@/siri/matchSiriLibrary";
import {normalizeSiriQuery} from "@/siri/normalizeSiriQuery";
import {
  parseSiriPlaybackOptions,
  SiriPlaybackOptions,
} from "@/siri/parseSiriPlaybackOptions";
import {
  DONATED_VIDEO_PREFIX,
  parseSiriRequest,
  SiriSearchRequest,
} from "@/siri/parseSiriRequest";
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
  /** Ratings go through the TV client, like the like buttons in the app. */
  youtubeTV: ReturnType<typeof useYoutubeTVContext>;
  player: ReturnType<typeof useMusikPlayerContext>;
  saveVideoToPlaylist: (
    videoIds: string[],
    playlistId: string,
  ) => Promise<void>;
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

/** Shows in the log why a request fell back to the YouTube search. */
function librarySummary(library: SiriLibrary | undefined) {
  if (!library) {
    return " (no library)";
  }
  const account = library.playlists.filter(p => p.source === "account").length;
  return ` (library: ${library.playlists.length - account} local, ${account} account playlists, ${library.downloads.length} downloads)`;
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

/**
 * The track an affinity or add request is about: an item Siri resolved from
 * a donation, otherwise what is playing ("I like this song").
 */
function targetTrack(
  request: SiriMediaRequest,
  refs: MutableRefObject<BridgeRefs>,
) {
  const {currentItem} = refs.current.player;
  if (request.itemIdentifier?.startsWith(DONATED_VIDEO_PREFIX)) {
    const videoId = request.itemIdentifier.slice(DONATED_VIDEO_PREFIX.length);
    return {
      videoId,
      title: videoId === currentItem?.id ? currentItem.title : undefined,
    };
  }
  return currentItem
    ? {videoId: currentItem.id, title: currentItem.title}
    : undefined;
}

async function handleAffinity(
  request: SiriMediaRequest,
  refs: MutableRefObject<BridgeRefs>,
) {
  const track = targetTrack(request, refs);
  const {youtubeTV} = refs.current;
  if (!track || !youtubeTV || request.affinity === "unknown") {
    complete(request, "failure", {
      detail: !track ? "nothing playing" : "cannot rate",
    });
    return;
  }
  if (request.affinity === "like") {
    await youtubeTV.interact.like(track.videoId);
  } else {
    await youtubeTV.interact.dislike(track.videoId);
  }
  complete(request, "success", {
    title: track.title,
    detail: request.affinity,
  });
}

async function handleAdd(
  request: SiriMediaRequest,
  refs: MutableRefObject<BridgeRefs>,
) {
  const track = targetTrack(request, refs);
  if (!track) {
    complete(request, "failure", {detail: "nothing playing"});
    return;
  }
  // YouTube Music's library for songs is "Liked music".
  if (request.destination !== "playlist" || !request.playlistName) {
    const {youtubeTV} = refs.current;
    if (!youtubeTV) {
      complete(request, "failure", {detail: "YouTube not ready"});
      return;
    }
    await youtubeTV.interact.like(track.videoId);
    complete(request, "success", {
      title: track.title,
      detail: "added to library",
    });
    return;
  }
  // Siri leaves the app name in the destination, or even sends it alone
  // ("React Tube") when the request named the app before the playlist.
  const playlistName = normalizeSiriQuery(request.playlistName);
  if (!playlistName) {
    complete(request, "notFound", {detail: "playlist name was the app name"});
    return;
  }
  const library = await loadSiriLibrary();
  const playlist = findSiriLibraryPlaylist(library, playlistName);
  if (!playlist) {
    complete(request, "notFound", {
      detail: `no playlist matches${librarySummary(library)}`,
    });
    return;
  }
  await refs.current.saveVideoToPlaylist([track.videoId], playlist.id);
  complete(request, "success", {
    title: track.title,
    detail: `added to ${playlist.source} playlist`,
  });
}

/** Shuffle and repeat apply to whatever starts next, so set them first. */
function applyPlaybackOptions(
  options: SiriPlaybackOptions,
  player: BridgeRefs["player"],
) {
  if (options.shuffle !== undefined) {
    player.setShuffle(options.shuffle);
  }
  if (options.repeat) {
    player.setRepeat(options.repeat === "off" ? undefined : options.repeat);
  }
}

/** A queue entry for "play X next"; the player only needs id and metadata. */
function queueItem(
  videoId: string,
  title?: string,
  artist?: string,
): VideoData {
  return {
    originalNode: {} as VideoData["originalNode"],
    type: "video",
    id: videoId,
    title: title ?? "",
    author: artist ? ({name: artist} as VideoData["author"]) : undefined,
    thumbnailImage: {
      url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      width: 480,
      height: 360,
    },
  };
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

  if (request.intent === "affinity" || request.intent === "add") {
    if (!(await waitForYoutube(refs))) {
      complete(request, "failure", {detail: "YouTube not ready"});
      return;
    }
    await (request.intent === "affinity"
      ? handleAffinity(request, refs)
      : handleAdd(request, refs));
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
  const library = await loadSiriLibrary().catch(error => {
    // The YouTube search still works without the library.
    LOGGER.warn("Loading the Siri library failed", error);
    return undefined;
  });
  const resolve = () =>
    resolveSiriRequest(
      youtube,
      parsed,
      {
        hasCurrentItem: !!player.currentItem,
        currentVideoId: player.currentItem?.id,
        lastPlayed: getLastPlayedTrack(),
      },
      library,
    );
  // A connection that was idle in the background often fails once ("network
  // connection was lost"); one retry fits easily into Siri's deadline.
  const resolution = await resolve().catch(error => {
    if (isSiriRequestExpired(request)) {
      throw error;
    }
    LOGGER.warn(`${request.requestId} retrying after`, error);
    return resolve();
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

  const options = parseSiriPlaybackOptions(request);
  applyPlaybackOptions(options, player);

  // "Play X next": insert after the current track. Without a queue there is
  // nothing to insert into, so the track then plays right away.
  if (options.queue === "next" && player.currentItem && player.playlist) {
    const next =
      resolution.kind === "play" && resolution.endpoint.payload?.videoId
        ? queueItem(
            resolution.endpoint.payload.videoId,
            resolution.title,
            resolution.artist,
          )
        : resolution.kind === "playDownload"
          ? queueItem(resolution.videoId, resolution.title, resolution.artist)
          : undefined;
    if (next) {
      const currentIndex = player.playlist.items.findIndex(
        item => item.id === player.currentItem?.id,
      );
      player.addAsNextItem(next);
      complete(request, "success", {
        title: next.title || undefined,
        artist: next.author?.name,
        detail: `queued next (queue ${player.playlist.items.length} items, current at ${currentIndex})`,
      });
      return;
    }
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

  if (resolution.kind === "playDownload") {
    player.setPlaylistViaLocalDownload(resolution.videoId);
    complete(request, "success", {
      title: resolution.title,
      artist: resolution.artist,
      detail: "download",
    });
    return;
  }

  if (resolution.kind === "playLocalPlaylist") {
    // Starting the first track lets the player queue the rest from the
    // database, like "play all" on the playlist screen.
    const playlist = await getPlaylistAsYTPlaylist(resolution.playlistId);
    const firstTrack = playlist.items.find(
      (item): item is VideoData => item.type === "video",
    );
    if (!firstTrack) {
      complete(request, "notFound", {detail: "local playlist is empty"});
      return;
    }
    player.setCurrentItem(firstTrack);
    complete(request, "success", {
      title: resolution.title,
      detail: "local playlist",
    });
    return;
  }

  // Only the mini player appears; the current screen stays.
  player.setPlaylistViaEndpoint(resolution.endpoint);
  complete(request, "success", {
    title: resolution.title,
    artist: resolution.artist,
    detail: resolution.via ?? `${parsed.kind}${librarySummary(library)}`,
  });
}

export default function useSiriMediaBridge() {
  const youtube = useYoutubeContext();
  const youtubeTV = useYoutubeTVContext();
  const player = useMusikPlayerContext();
  const {saveVideoToPlaylist} = usePlaylistManager();
  const {appSettings} = useAppData();
  const playbackEnabled = !!appSettings.siriPlaybackEnabled;
  const donationsEnabled = !!appSettings.siriDonationsEnabled;

  const current: BridgeRefs = {
    youtube,
    youtubeTV,
    player,
    saveVideoToPlaylist,
    playbackEnabled,
  };
  const refs = useRef<BridgeRefs>(current);
  refs.current = current;

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
