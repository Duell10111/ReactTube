import {
  addMessageListener,
  transferUserInfo,
  updateApplicationContext,
  useInstalled,
} from "expo-watch-connectivity";
import {useCallback, useEffect, useRef} from "react";

import {handleWatchMessage} from "./WatchYoutubeAPI";

import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {useYoutubeContext} from "@/context/YoutubeContext";
import useMusicLibrary from "@/hooks/music/useMusicLibrary";
import Logger from "@/utils/Logger";

interface WatchApplicationContext {
  source?: "phone";
  title?: string;
  playing?: boolean;
}

const LOGGER = Logger.extend("WATCH_SYNC");

/**
 * Playback state and YouTube API requests between phone and watch. The watch
 * library (snapshots, commands, file transfers) lives in WatchLibraryContext.
 */
export default function useWatchSync() {
  const innertube = useYoutubeContext();
  const {currentItem, next, previous, pause, play, playing} =
    useMusikPlayerContext();
  const installed = useInstalled();

  // Hook data providing hybrid data access
  const library = useMusicLibrary();
  const watchDataRef = useRef({library});
  watchDataRef.current = {library};

  useEffect(() => {
    // TODO: Add check if app is installed/paired
    if (!installed) {
      LOGGER.debug("Skip media update as no watch app is paired");
      return;
    }
    const update: WatchApplicationContext = {};
    update["source"] = "phone";
    // console.log("Used current item", currentItem);
    if (currentItem) {
      // console.log("Used current item", currentItem);
      update["title"] = currentItem.title;
    }
    update["playing"] = !!playing;

    updateApplicationContext(update)
      .then(() => LOGGER.debug("Updated Application context"))
      .catch(LOGGER.warn);
  }, [currentItem?.title, playing, installed]);

  const musicPlayerAction = useCallback(
    async (action: "next" | "prev" | "playpause") => {
      if (action === "next") {
        await next();
      } else if (action === "prev") {
        await previous();
      } else if (action === "playpause") {
        (playing ? pause : play)();
      }
    },
    [next, previous, play, pause, playing],
  );

  useEffect(() => {
    const sub = addMessageListener(messageFromWatch => {
      // TODO: Add listener for music context control commands
      console.log("Message from watch: ", messageFromWatch);
      if (messageFromWatch.type === "PhoneNext") {
        console.log("Next item triggered");
        musicPlayerAction("next").catch(LOGGER.warn);
      } else if (messageFromWatch.type === "PhonePrev") {
        musicPlayerAction("prev").catch(LOGGER.warn);
      } else if (messageFromWatch.type === "PhonePausePlay") {
        musicPlayerAction("playpause").catch(LOGGER.warn);
      } else if (messageFromWatch.type === "GetDownloads") {
        // handleDiaryUpdate(db, messageFromWatch)
        //   .catch(console.warn)
        //   .then(() => console.log("Handled watch data"));
      } else if (
        messageFromWatch.type === "youtubeAPI" &&
        messageFromWatch.payload
      ) {
        console.log(
          "Received youtubeAPI message from watch: ",
          messageFromWatch,
        );
        handleWatchMessage(
          innertube,
          messageFromWatch.payload,
          watchDataRef.current.library,
        )
          .then(async response => {
            if (Array.isArray(response)) {
              await Promise.all(response.map(res => sendYTAPIMessage(res)));
            } else if (response) {
              await sendYTAPIMessage(response);
            }
          })
          .catch(LOGGER.warn);
      }
      // reply({text: 'Thanks watch!'})
    });
    return () => sub.remove();
  }, [innertube, musicPlayerAction]);
}

async function sendYTAPIMessage(response: any) {
  const ytResponse = sanitizeWatchPayload({
    type: "youtubeAPI",
    payload: response,
  });
  LOGGER.debug(
    "Sending WATCH YT API response: ",
    JSON.stringify(ytResponse, null, 2),
  );
  const accepted = await transferUserInfo(ytResponse);
  if (!accepted) {
    throw new Error("Watch Connectivity is not active or rejected the payload");
  }
}

function sanitizeWatchPayload(value: any): any {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (Array.isArray(value)) {
    return value
      .map(item => sanitizeWatchPayload(item))
      .filter(item => item !== undefined);
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [key, sanitizeWatchPayload(item)] as const)
        .filter(([, item]) => item !== undefined),
    );
  }
  return value;
}
