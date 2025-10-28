import {Paths, Directory, File} from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import {DownloadResumable} from "expo-file-system/legacy";
import {useRef} from "react";
import {DeviceEventEmitter} from "react-native";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {
  createPlaylist,
  findVideo,
  insertVideo,
} from "@/downloader/DownloadDatabaseOperations";
import {YTTrackInfo, YTVideoInfo} from "@/extraction/Types";
import {
  getElementDataFromTrackInfo,
  getElementDataFromVideoInfo,
  getElementDataFromYTPlaylist,
} from "@/extraction/YTElements";
import Logger from "@/utils/Logger";

const downloadDir = new Directory(Paths.document, "downloads");

export const videoDir = new Directory(downloadDir, "videos");
export const playlistDir = new Directory(downloadDir, "playlist");

const LOGGER = Logger.extend("DOWNLOADER");

const VideoDownloadUpdate = "VideoDownloadUpdate";

export function getVideoDownloadEventUpdate(id: string) {
  return `${VideoDownloadUpdate}-${id}`;
}

export type DownloadRef = {[id: string]: DownloadObject};

export default function useDownloadProcessor() {
  const youtube = useYoutubeContext();

  const downloadRefs = useRef<DownloadRef>({});

  const download = async (id: string, type: "audio" | "video" = "audio") => {
    const video = await findVideo(id);
    if (video && video.fileUrl) {
      console.log("Video: ", video);
      LOGGER.debug("Video already downloaded");
      return;
    }

    LOGGER.debug("Download video: ", id);
    let info: YTTrackInfo | YTVideoInfo;
    if (type === "audio") {
      info = getElementDataFromTrackInfo(await youtube!.music.getInfo(id));

      // Patch originalData
      const orgData = await youtube!.getInfo(id, {client: "IOS"});
      // @ts-ignore TODO: Fix
      info.originalData = orgData;
    } else {
      info = getElementDataFromVideoInfo(
        await youtube!.getInfo(id, {client: "IOS"}),
      );
    }

    const format = info.originalData.chooseFormat({
      type: "audio",
    });
    LOGGER.debug("Download video: ", format);
    const url = await format.decipher(youtube!.actions.session.player);
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
            LOGGER.debug(`Video downloaded to: ${results[0].uri}`);
            LOGGER.debug(`Video cover downloaded to: ${results[1]?.uri}`);
            await insertVideo(
              id,
              info.title,
              format.approx_duration_ms,
              value.fileURL[1],
              value.fileURL[0],
              undefined,
              info.author?.name,
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

  const downloadPlaylistCoverWrapper = async (
    id: string,
    overridePlaylistOverride?: {
      title: string;
      description?: string;
      coverUrl: string;
    },
  ) => {
    LOGGER.debug(`Download playlist cover: ${id}`);

    let info = overridePlaylistOverride;
    if (!info) {
      LOGGER.debug(`Fetching playlist data for ${id}`);
      const playlistData = getElementDataFromYTPlaylist(
        await youtube!.getPlaylist(id),
      );
      info = {
        coverUrl: playlistData.thumbnailImage.url,
        title: playlistData.title,
      };
    }

    const value = await downloadPlaylistCover(id, info.coverUrl, data => {
      if (downloadRefs.current[id]) {
        downloadRefs.current[id].process =
          data.totalBytesWritten / data.totalBytesExpectedToWrite;
      } else {
        LOGGER.warn(
          "Error updating cover progress: ",
          downloadRefs.current[id],
        );
      }
      LOGGER.debug(
        `Updating progress for ${id} cover with ${downloadRefs.current[id].process}`,
      );
    });
    downloadRefs.current[id] = value;

    const result = await value.download[0].downloadAsync();
    if (result) {
      LOGGER.debug(`Playlist cover downloaded to ${result.uri}`);
      await createPlaylist(id, info.title, info.description, value.fileURL[0]);
      LOGGER.debug(`Insert downloaded playlist cover for ${value.id}`);
    } else {
      LOGGER.warn(`Downloaded playlist cover ${value.id} canceled`);
    }
  };

  return {
    downloadRefs,
    download,
    downloadPlaylistCover: downloadPlaylistCoverWrapper,
  };
}

// TODO: Rename to getAbsoluteDownloadURL?
export function getAbsoluteVideoURL(url: string) {
  return videoDir + url;
}

export function getAbsolutePlaylistURL(url: string) {
  return playlistDir + url;
}

async function ensureDirExists(directory = downloadDir) {
  if (!directory.exists) {
    console.log(directory, " directory doesn't exist, creating…");
    directory.create({intermediates: true});
  }
}

export interface DownloadObject {
  id: string;
  fileURL: string[];
  contentType: "video" | "playlist";
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
  await ensureDirExists(new Directory(videoDir, id));

  const videoURL = `${id}/${audioOnly ? "audio" : "video"}.mp4`;
  const fileURL = new File(videoDir, videoURL).uri;
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
    const coverFileFullURL = new File(videoDir, coverFileURL).uri;
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

async function downloadVideoCover(
  id: string,
  coverUrl: string,
  coverUrlCallback?: FileSystem.FileSystemNetworkTaskProgressCallback<FileSystem.DownloadProgressData>,
) {
  await ensureDirExists();
  await ensureDirExists(new Directory(videoDir, id));

  console.log("Download cover as well!");
  const coverFileURL = `${id}/cover.jpg`;
  const coverFileFullURL = new File(videoDir, coverFileURL).uri;
  const coverDownload = FileSystem.createDownloadResumable(
    coverUrl,
    coverFileFullURL,
    undefined,
    coverUrlCallback,
  );

  return {
    id,
    download: [coverDownload],
    fileURL: [coverFileURL],
    process: 0,
    progressDownloads: [0],
    type: "cover_only",
    contentType: "video",
  } as DownloadObject;
}

async function downloadPlaylistCover(
  id: string,
  coverUrl: string,
  coverUrlCallback?: FileSystem.FileSystemNetworkTaskProgressCallback<FileSystem.DownloadProgressData>,
) {
  const parentDir = getPlaylistDir(id);
  await ensureDirExists();
  await ensureDirExists(parentDir);

  const coverFileURL = `${id}/cover.jpg`;
  const coverFileFullURL = new File(playlistDir, coverFileURL).uri;
  const coverDownload = FileSystem.createDownloadResumable(
    coverUrl,
    coverFileFullURL,
    undefined,
    coverUrlCallback,
  );

  return {
    id,
    download: [coverDownload],
    fileURL: [coverFileURL],
    process: 0,
    progressDownloads: [0],
    type: "cover_only",
    contentType: "playlist",
  } as DownloadObject;
}

function getVideoDir(id: string) {
  return new Directory(videoDir, id);
}

function getPlaylistDir(id: string) {
  return new Directory(playlistDir, id);
}

export async function deleteVideoFilesIfExists(id: string) {
  return getVideoDir(id).delete();
}
