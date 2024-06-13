import {
  watchEvents,
  sendMessage,
  startFileTransfer,
} from "@duell10111/react-native-watch-connectivity";
import {getFileTransfers} from "@duell10111/react-native-watch-connectivity/build/files";
import {useEffect} from "react";

import {useVideos} from "../../downloader/DownloadDatabaseOperations";
import LOGGER from "../../utils/Logger";
import {getAbsoluteVideoURL} from "../downloader/useDownloadProcessor";

export default function useWatchSync() {
  const videos = useVideos();

  useEffect(() => {
    return watchEvents.addListener("message", (messageFromWatch, reply) => {
      console.log("Message from watch: ", messageFromWatch);
      if (messageFromWatch.type === "GetDownloads") {
        // handleDiaryUpdate(db, messageFromWatch)
        //   .catch(console.warn)
        //   .then(() => console.log("Handled watch data"));
      } else if (
        messageFromWatch.type === "requestDownload" &&
        messageFromWatch.id
      ) {
        console.log("Received download message from watch: ", messageFromWatch);
        sendDownloadToWatch(messageFromWatch.id, videos).catch(console.warn);
      }
      // reply({text: 'Thanks watch!'})
    });
  }, []);

  const upload = (id: string) => {
    sendDownloadDataToWatch(id, videos).catch(console.warn);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      checkTransfers().catch(console.warn);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return {upload};
}

async function sendDownloadDB(videos: ReturnType<typeof useVideos>) {
  const db = generateDownloadDB(videos);
  sendMessage({
    type: "DownloadDB",
    data: JSON.stringify(db),
  });
}

async function sendDownloadedFilesToWatch(
  videos: ReturnType<typeof useVideos>,
) {
  const fileTransfers = await getFileTransfers();

  Object.entries(fileTransfers).map(([transferId, transferInfo]) => {
    const {
      completedUnitCount, // num bytes completed
      estimatedTimeRemaining,
      fractionCompleted,
      throughput, // Bit rate
      totalUnitCount, // total num. bytes
      url, // url of file being transferred
      metadata, // file metadata
      id, // id === transferId
      startTime, // time that the file transfer started
      endTime, // time that the file transfer ended
      error, // null or [Error] if the file transfer failed
    } = transferInfo;
  });

  const {id} = await startFileTransfer("file:///path/to/file", metadata);
}

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

  console.log(`Sending Download data to watch ${id}`);

  sendMessage({
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

  const metadata = {
    id,
  };
  console.log("Starting file transfer");
  const {id: fileID} = await startFileTransfer(
    getAbsoluteVideoURL(video.fileUrl),
    metadata,
  );

  console.log(`Finished file transfer for video ${id}`);

  // Check transfers

  checkTransfers();
}

async function checkTransfers() {
  const fileTransfers = await getFileTransfers();

  Object.entries(fileTransfers).map(([transferId, transferInfo]) => {
    console.log("TransferInfo: ", transferInfo);
  });
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

function generateDownloadDB(videos: ReturnType<typeof useVideos>) {
  const JSONVideos = videos.map(
    v =>
      ({
        id: v.id,
        duration: v.duration,
        playlistId: v.playlistId,
        title: v.name,
      }) as JSONVideos,
  );

  return {
    videos: JSONVideos,
  } as DownloadDB;
}
