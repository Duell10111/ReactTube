import * as FileSystem from "expo-file-system";
import {useState} from "react";

import {useYoutubeContext} from "../../context/YoutubeContext";
import {insertVideo} from "../../downloader/DownloadDatabaseOperations";
import Logger from "../../utils/Logger";

const downloadDir = FileSystem.documentDirectory + "downloads/";

const videoDir = downloadDir + "videos/";

const LOGGER = Logger.extend("DOWNLOADER");

export default function useDownloadProcessor() {
  const youtube = useYoutubeContext();

  const [downloads, setDownloads] = useState([]);

  const download = async (id: string) => {
    LOGGER.debug("Download video: ", id);
    const format = await youtube.getStreamingData(id, {
      format: "mp4",
      type: "audio",
    });
    LOGGER.debug("Download video: ", format);
    const url = format.decipher(youtube.actions.session.player);
    if (url) {
      LOGGER.debug("Download video with url: ", url);
      downloadVideo(id, url, true).catch(LOGGER.warn);
    }
  };

  return {download};
}

async function ensureDirExists(directory = downloadDir) {
  const dirInfo = await FileSystem.getInfoAsync(directory);
  if (!dirInfo.exists) {
    console.log(directory, " directory doesn't exist, creating…");
    await FileSystem.makeDirectoryAsync(directory, {intermediates: true});
  }
}

async function downloadVideo(id: string, url: string, audioOnly?: boolean) {
  await ensureDirExists();
  // FileSystem.createDownloadResumable(url, videoDir + id);
  await ensureDirExists(`${videoDir}${id}`);
  const fileURL = `${videoDir}${id}/${audioOnly ? "audio" : "video"}.mp4`;
  const result = await FileSystem.downloadAsync(url, fileURL);
  LOGGER.debug(`Video downloaded to ${result.uri}`);
  await insertVideo(id, "", fileURL);
  LOGGER.debug("Insert downloaded video");
}
