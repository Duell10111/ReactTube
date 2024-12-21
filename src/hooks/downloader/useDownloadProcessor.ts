import * as FileSystem from "expo-file-system";
import {DownloadResumable} from "expo-file-system";
import {useRef} from "react";
import {DeviceEventEmitter} from "react-native";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {insertVideo} from "@/downloader/DownloadDatabaseOperations";
import {getElementDataFromVideoInfo} from "@/extraction/YTElements";
import Logger from "@/utils/Logger";

const downloadDir = FileSystem.documentDirectory + "downloads/";

export const videoDir = downloadDir + "videos/";

const LOGGER = Logger.extend("DOWNLOADER");

const VideoDownloadUpdate = "VideoDownloadUpdate";

export function getVideoDownloadEventUpdate(id: string) {
  return `${VideoDownloadUpdate}-${id}`;
}

export type DownloadRef = {[id: string]: DownloadObject};

export default function useDownloadProcessor() {
  const youtube = useYoutubeContext();

  const downloadRefs = useRef<DownloadRef>({});

  const download = async (id: string) => {
    LOGGER.debug("Download video: ", id);
    const info = getElementDataFromVideoInfo(await youtube!.getInfo(id, "IOS"));
    const format = info.originalData.chooseFormat({
      type: "audio",
    });
    LOGGER.debug("Download video: ", format);
    const url = format.decipher(youtube!.actions.session.player);
    if (url) {
      LOGGER.debug("Download video with url: ", url);
      LOGGER.debug("Download cover with url: ", info.thumbnailImage.url);
      downloadVideo(
        id,
        url,
        true,
        data => {
          // TODO: Add Event to publish current complete download progress via DeviceEventEmitter
          if (downloadRefs.current[id]) {
            const progress =
              data.totalBytesWritten / data.totalBytesExpectedToWrite;

            // Set progress in dependence to other download if exists
            if (downloadRefs.current[id].download.length > 1) {
              downloadRefs.current[id].progressDownloads[0] = progress;
              downloadRefs.current[id].process =
                (downloadRefs.current[id].progressDownloads[1] + progress) / 2;
            } else {
              downloadRefs.current[id].process = progress;
            }
          } else {
            LOGGER.warn(
              "Error updating video progress: ",
              downloadRefs.current[id],
            );
          }
          LOGGER.debug(
            `Updating progress for ${id} video with ${downloadRefs.current[id].process}`,
          );
          DeviceEventEmitter.emit(
            getVideoDownloadEventUpdate(id),
            downloadRefs.current[id].process,
          );
        },
        info.thumbnailImage.url,
        data => {
          if (downloadRefs.current[id]) {
            const progress =
              data.totalBytesWritten / data.totalBytesExpectedToWrite;
            downloadRefs.current[id].progressDownloads[1] = progress;
            downloadRefs.current[id].process =
              (downloadRefs.current[id].progressDownloads[0] + progress) / 2;
          } else {
            LOGGER.warn(
              "Error updating cover progress: ",
              downloadRefs.current[id],
            );
          }
          LOGGER.debug(
            `Updating progress for ${id} cover with ${downloadRefs.current[id].process}`,
          );
        },
      )
        .then(async value => {
          downloadRefs.current[id] = value;
          LOGGER.debug("Download Object: ", value);
          LOGGER.debug(`FileURL: ${value.fileURL}`);
          const results = await Promise.all(
            value.download.map(d => d.downloadAsync()),
          );
          if (results[0]) {
            LOGGER.debug(`Video downloaded to ${results[0].uri}`);
            LOGGER.debug(`Video cover download: ${results[1]?.uri}`);
            await insertVideo(
              id,
              info.title,
              format.approx_duration_ms,
              value.fileURL[1],
              value.fileURL[0],
            );
            LOGGER.debug("Insert downloaded video");
          } else {
            LOGGER.warn(`Download ${value.id} canceled`);
          }

          delete downloadRefs.current[id];
        })
        .catch(LOGGER.warn);
    }
  };

  return {downloadRefs, download};
}

// TODO: Rename to getAbsoluteDownloadURL?
export function getAbsoluteVideoURL(url: string) {
  return videoDir + url;
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
  fileURL: string[];
  type: "audio" | "video" | "cover_only";
  download: FileSystem.DownloadResumable[];
  progressDownloads: number[];
  process: number;
  // TODO: Add Download Metadata?
}

async function downloadVideo(
  id: string,
  url: string,
  audioOnly?: boolean,
  callback?: FileSystem.FileSystemNetworkTaskProgressCallback<FileSystem.DownloadProgressData>,
  coverUrl?: string,
  coverUrlCallback?: FileSystem.FileSystemNetworkTaskProgressCallback<FileSystem.DownloadProgressData>,
) {
  await ensureDirExists();
  await ensureDirExists(`${videoDir}${id}`);

  const videoURL = `${id}/${audioOnly ? "audio" : "video"}.mp4`;
  const fileURL = `${videoDir}${videoURL}`;
  const download = FileSystem.createDownloadResumable(
    url,
    fileURL,
    undefined,
    callback,
  );

  let coverFileURL: string | undefined;
  let coverDownload: DownloadResumable | undefined;

  if (coverUrl) {
    console.log("Download cover as well!");
    coverFileURL = `${id}/cover.jpg`;
    const coverFileFullURL = `${videoDir}${coverFileURL}`;
    coverDownload = FileSystem.createDownloadResumable(
      coverUrl,
      coverFileFullURL,
      undefined,
      coverUrlCallback,
    );
  }

  return {
    id,
    download: coverUrl ? [download, coverDownload] : [download],
    fileURL: coverUrl ? [videoURL, coverFileURL] : [videoURL],
    process: 0,
    progressDownloads: [0, 0],
    type: "video",
  } as DownloadObject;
}

function getVideoDir(id: string) {
  return `${videoDir}${id}`;
}

export async function deleteVideoFilesIfExists(id: string) {
  return FileSystem.deleteAsync(getVideoDir(id), {idempotent: true});
}
