import {
  addMessageListener,
  addFileTransferFinishedListener,
  sendMessage,
  sendFile,
  getCurrentFileTransfers,
  updateApplicationContext,
  useInstalled,
  FileTransferInfo,
} from "expo-watch-connectivity";
import {useCallback, useEffect, useState} from "react";

import {handleWatchMessage} from "./WatchYoutubeAPI";
import {getAbsoluteVideoURL} from "../downloader/useDownloadProcessor";

import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {useYoutubeContext} from "@/context/YoutubeContext";
import {useVideos} from "@/downloader/DownloadDatabaseOperations";
import useMusicLibrary from "@/hooks/music/useMusicLibrary";
import Logger from "@/utils/Logger";
import {showMessage} from "@/utils/ShowFlashMessageHelper";

interface WatchApplicationContext {
  source?: "phone";
  title?: string;
  playing?: boolean;
}

const LOGGER = Logger.extend("WATCH_SYNC");

export default function useWatchSync() {
  const videos = useVideos();
  const innertube = useYoutubeContext();
  const {currentItem, next, previous, pause, play, playing} =
    useMusikPlayerContext();
  const [watchTransfers, setWatchTransfers] = useState<FileTransferInfo[]>([]);
  const installed = useInstalled();

  // Hook data providing hybrid data access
  const library = useMusicLibrary();

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
        messageFromWatch.type === "requestDownload" &&
        messageFromWatch.id
      ) {
        console.log("Received download message from watch: ", messageFromWatch);
        sendDownloadToWatch(messageFromWatch.id, videos).catch(console.warn);
      } else if (
        messageFromWatch.type === "youtubeAPI" &&
        messageFromWatch.payload
      ) {
        console.log(
          "Received youtubeAPI message from watch: ",
          messageFromWatch,
        );
        handleWatchMessage(innertube, messageFromWatch.payload, library)
          .then(async response => {
            if (Array.isArray(response)) {
              await Promise.all(
                response.map(res => {
                  sendYTAPIMessage(res);
                }),
              );
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

  const upload = (id: string) => {
    sendDownloadToWatch(id, videos)
      .then(() => {
        showMessage({
          type: "success",
          message: "Successfully started watch upload",
        });
      })
      .catch(error => {
        showMessage({
          type: "warning",
          message: "Failed to upload to watch",
          description: error,
        });
        LOGGER.warn(error);
      });
  };

  const sendPlaylist = (id: string) => {
    sendPlaylistToWatch(id, innertube, library)
      .then(() => {
        showMessage({
          type: "success",
          message: "Successfully sent playlist to watch",
        });
      })
      .catch(error => {
        showMessage({
          type: "warning",
          message: "Failed to send playlist to watch",
          description: error,
        });
      });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      // TODO: Add UI to show progress
      checkTransfers().then(setWatchTransfers).catch(LOGGER.warn);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    sendMessage({test: "test"}).catch(LOGGER.warn);
  }, []);

  useEffect(() => {
    const sub = addFileTransferFinishedListener(info => {
      LOGGER.debug(`Finished file transfer with info: ${info}`);
      if (info.error) {
        showMessage({
          type: "danger",
          message: "Error sending file to watch!",
          description: info.error,
        });
      } else {
        showMessage({
          type: "success",
          message: "Successfully uploaded to watch",
        });
      }
    });
    return () => sub.remove();
  }, []);

  return {watchTransfers, upload, sendPlaylist};
}

async function sendYTAPIMessage(response: any) {
  const ytResponse = {
    type: "youtubeAPI",
    payload: response,
  };
  LOGGER.debug(
    "Sending WATCH YT API response: ",
    JSON.stringify(ytResponse, null, 2),
  );
  await sendMessage(ytResponse);
}

async function sendPlaylistToWatch(
  id: string,
  innertube: ReturnType<typeof useYoutubeContext>,
  library: ReturnType<typeof useMusicLibrary>,
) {
  // Reuse existing code
  await sendYTAPIMessage(
    await handleWatchMessage(
      innertube,
      {
        request: "playlist",
        playlistId: id,
      },
      library,
    ),
  );
}

async function sendDownloadToWatch(
  id: string,
  videos: ReturnType<typeof useVideos>,
) {
  const video = videos.find(v => v.id === id);

  if (!video) {
    LOGGER.warn(
      "You must specify a video ID which is contained in the database",
    );
    return;
  }

  if (!video.fileUrl) {
    LOGGER.warn("You must specify a video with a fileURL to watch");
    return;
  }

  const metadata = {
    id,
    title: video.name,
    duration: video.duration,
  };
  LOGGER.debug("Starting file transfer");
  LOGGER.debug(`Uploading file ${getAbsoluteVideoURL(video.fileUrl)}`);
  await sendFile(getAbsoluteVideoURL(video.fileUrl), metadata);

  LOGGER.debug(`Finished file transfer for video ${id}`);

  // Check transfers

  checkTransfers();
}

async function checkTransfers() {
  const fileTransfers = await getCurrentFileTransfers();
  LOGGER.debug("File Transfers: ", fileTransfers);

  Object.entries(fileTransfers).map(([transferId, transferInfo]) => {
    LOGGER.debug("TransferInfo: ", transferInfo);
  });
  // TODO: Fix once type fixed in library
  return fileTransfers as any as FileTransferInfo[];
}
