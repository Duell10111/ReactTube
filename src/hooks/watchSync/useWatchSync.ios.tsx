import {
  addMessageListener,
  addFileTransferFinishedListener,
  sendMessage,
  sendFile,
  getCurrentFileTransfers,
  updateApplicationContext,
  isWatchAppInstalled,
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
  const [watchAppInstalled, setWatchAppInstalled] = useState(false);

  // Hook data providing hybrid data access
  const library = useMusicLibrary();

  useEffect(() => {
    isWatchAppInstalled().then(setWatchAppInstalled).catch(LOGGER.warn);
  }, []);

  useEffect(() => {
    const update: WatchApplicationContext = {};
    update["source"] = "phone";
    console.log("Used current item", currentItem);
    if (currentItem) {
      console.log("Used current item", currentItem);
      update["title"] = currentItem.title;
    }
    update["playing"] = !!playing;

    updateApplicationContext(update)
      .then(() => LOGGER.debug("Updated Application context"))
      .catch(LOGGER.warn);
  }, [currentItem?.title, playing]);

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

  return {watchTransfers, upload};
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

async function sendDownloadDB(videos: ReturnType<typeof useVideos>) {
  const db = generateDownloadDB(videos);
  sendMessage({
    type: "DownloadDB",
    data: JSON.stringify(db),
  });
}

// async function sendDownloadedFilesToWatch(
//   videos: ReturnType<typeof useVideos>,
// ) {
//   const fileTransfers = await getFileTransfers();
//
//   Object.entries(fileTransfers).map(([transferId, transferInfo]) => {
//     const {
//       completedUnitCount, // num bytes completed
//       estimatedTimeRemaining,
//       fractionCompleted,
//       throughput, // Bit rate
//       totalUnitCount, // total num. bytes
//       url, // url of file being transferred
//       metadata, // file metadata
//       id, // id === transferId
//       startTime, // time that the file transfer started
//       endTime, // time that the file transfer ended
//       error, // null or [Error] if the file transfer failed
//     } = transferInfo;
//   });
//
//   const {id} = await startFileTransfer("file:///path/to/file", metadata);
// }

async function sendDownloadDataToWatch(
  id: string,
  videos: ReturnType<typeof useVideos>,
) {
  const video = videos.find(v => v.id === id);

  if (!video) {
    LOGGER.warn(
      `You must specify a video ID which is contained in the database. ID ${id} not found`,
    );
    return;
  }

  LOGGER.debug(`Sending Download data to watch ${id}`);

  // TODO: Include data in file upload metadata instead of extra message?
  await sendMessage({
    type: "uploadFile",
    id,
    title: video.name,
    duration: video.duration,
  });
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

interface DownloadDB {
  videos: JSONVideos[];
}

interface JSONVideos {
  id: string;
  duration: number;
  title?: string;
  playlistId?: string;
}

// TODO: Migrate to new database schema?
function generateDownloadDB(videos: ReturnType<typeof useVideos>) {
  const JSONVideos = videos.map(
    v =>
      ({
        id: v.id,
        duration: v.duration,
        title: v.name,
      }) as JSONVideos,
  );

  return {
    videos: JSONVideos,
  } as DownloadDB;
}
