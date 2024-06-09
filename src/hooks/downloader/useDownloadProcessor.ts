import * as FileSystem from "expo-file-system";
import {useRef, useState} from "react";

import {useYoutubeContext} from "../../context/YoutubeContext";
import {insertVideo} from "../../downloader/DownloadDatabaseOperations";
import {getElementDataFromVideoInfo} from "../../extraction/YTElements";
import Logger from "../../utils/Logger";

const downloadDir = FileSystem.documentDirectory + "downloads/";

const videoDir = downloadDir + "videos/";

const LOGGER = Logger.extend("DOWNLOADER");

export type DownloadRef = {[id: string]: DownloadObject};

export default function useDownloadProcessor() {
  const youtube = useYoutubeContext();

  const downloadRefs = useRef<DownloadRef>({});

  const download = async (id: string) => {
    LOGGER.debug("Download video: ", id);
    const info = getElementDataFromVideoInfo(await youtube.getBasicInfo(id));
    const format = await youtube.getStreamingData(id, {
      format: "mp4",
      type: "audio",
    });
    LOGGER.debug("Download video: ", format);
    const url = format.decipher(youtube.actions.session.player);
    if (url) {
      LOGGER.debug("Download video with url: ", url);
      downloadVideo(id, url, true, data => {
        if (downloadRefs.current[id]) {
          downloadRefs.current[id].process =
            data.totalBytesWritten / data.totalBytesExpectedToWrite;
        } else {
          LOGGER.warn("Error updating progress: ", downloadRefs.current[id]);
        }
        LOGGER.debug(
          `Updating progress for ${id} with ${downloadRefs.current[id].process}`,
        );
      }).then(value => {
        downloadRefs.current[id] = value;
        value.download.downloadAsync().then(async result => {
          LOGGER.debug(`Video downloaded to ${result.uri}`);
          await insertVideo(id, info.title, result.uri);
          LOGGER.debug("Insert downloaded video");
          delete downloadRefs.current[id];
        });
      });
    }
  };

  return {downloadRefs, download};
}

async function ensureDirExists(directory = downloadDir) {
  const dirInfo = await FileSystem.getInfoAsync(directory);
  if (!dirInfo.exists) {
    console.log(directory, " directory doesn't exist, creating…");
    await FileSystem.makeDirectoryAsync(directory, {intermediates: true});
  }
}

export interface DownloadObject {
  id: string;
  fileURL: string;
  download: FileSystem.DownloadResumable;
  process: number;
}

async function downloadVideo(
  id: string,
  url: string,
  audioOnly?: boolean,
  callback?: FileSystem.FileSystemNetworkTaskProgressCallback<FileSystem.DownloadProgressData>,
) {
  await ensureDirExists();
  const fileURL = `${videoDir}${id}/${audioOnly ? "audio" : "video"}.mp4`;
  await ensureDirExists(`${videoDir}${id}`);
  const download = FileSystem.createDownloadResumable(
    url,
    fileURL,
    undefined,
    callback,
  );
  // const result = await FileSystem.downloadAsync(url, fileURL);
  // LOGGER.debug(`Video downloaded to ${result.uri}`);
  // await insertVideo(id, "", fileURL);
  // LOGGER.debug("Insert downloaded video");
  return {
    id,
    download,
    fileURL,
    process: 0,
  } as DownloadObject;
}
