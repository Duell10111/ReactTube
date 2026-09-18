import {Paths, Directory, File, FileMode} from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import {DownloadResumable} from "expo-file-system/legacy";
import {useRef} from "react";
import {DeviceEventEmitter} from "react-native";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {
  createPlaylist,
  deleteVideoLocalFileReferences,
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
import {
  PLAYBACK_CLIENTS_FULL_BYTE_RANGE,
  resolvePlaybackInfo,
} from "@/utils/PlaybackResolver";
import {choosePreferredAudioFormat} from "@/utils/music/AudioPlaybackSource";

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
    if (video?.fileUrl && isUsableDownloadedVideo(video.fileUrl)) {
      LOGGER.debug("Video already downloaded");
      return;
    }

    if (video?.fileUrl) {
      LOGGER.warn(`Removing invalid local download reference for ${id}`);
      await deleteVideoLocalFileReferences(
        id,
        video.coverUrl?.startsWith("http") ? video.coverUrl : undefined,
      );
      deleteVideoFilesIfExists(id);
    }

    if (downloadRefs.current[id]) {
      throw new Error("This song is already being downloaded.");
    }

    if (!youtube) {
      throw new Error("YouTube is not ready yet. Please try again.");
    }
    const youtubeClient = youtube;

    LOGGER.debug("Download video: ", id);
    let info: YTTrackInfo | YTVideoInfo;
    if (type === "audio") {
      info = getElementDataFromTrackInfo(await youtube.music.getInfo(id));
    } else {
      info = getElementDataFromVideoInfo(await youtube.getInfo(id));
    }

    let lastError: unknown;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const source = await resolveDownloadSource(id);
        await downloadResolvedAudio(id, info, source);
        return;
      } catch (error) {
        lastError = error;
        delete downloadRefs.current[id];
        deleteVideoFilesIfExists(id);
        LOGGER.warn(`Download attempt ${attempt} failed for ${id}: `, error);
      }
    }

    throw new Error(
      `Download failed after two attempts: ${errorMessage(lastError)}`,
    );

    async function resolveDownloadSource(downloadId: string) {
      const resolved = await resolvePlaybackInfo(youtubeClient, downloadId, {
        profile: "audio-download",
        skipAuth: true,
        clients: PLAYBACK_CLIENTS_FULL_BYTE_RANGE,
        accept: candidate =>
          candidate.playability_status?.status === "OK" &&
          !!choosePreferredAudioFormat(candidate)?.mime_type.includes(
            "audio/mp4",
          ),
      });
      const format = resolved && choosePreferredAudioFormat(resolved.info);
      if (!resolved || !format?.mime_type.includes("audio/mp4")) {
        throw new Error("No downloadable MP4 audio format is available.");
      }

      const url = await format.decipher(youtubeClient.session.player);
      if (!url) {
        throw new Error("The audio download URL could not be resolved.");
      }

      LOGGER.info(
        `Downloading ${downloadId} from ${resolved.client} · itag ${format.itag}`,
      );
      return {url, format};
    }

    async function downloadResolvedAudio(
      downloadId: string,
      trackInfo: YTTrackInfo | YTVideoInfo,
      source: Awaited<ReturnType<typeof resolveDownloadSource>>,
    ) {
      const value = await downloadVideo(
        downloadId,
        source.url,
        true,
        data =>
          updateDownloadProgress(
            downloadRefs.current,
            downloadId,
            0,
            data,
            true,
          ),
        trackInfo.thumbnailImage.url,
        data =>
          updateDownloadProgress(
            downloadRefs.current,
            downloadId,
            1,
            data,
            true,
          ),
      );
      downloadRefs.current[downloadId] = value;

      const [audioResult, coverResult] = await Promise.allSettled(
        value.download.map(item => item.downloadAsync()),
      );

      if (audioResult.status === "rejected") {
        throw audioResult.reason;
      }
      assertSuccessfulDownload(
        audioResult.value,
        value.fileURL[0],
        "audio",
        source.format.content_length,
      );

      let storedCoverUrl = trackInfo.thumbnailImage.url;
      if (coverResult?.status === "fulfilled") {
        try {
          assertSuccessfulDownload(
            coverResult.value,
            value.fileURL[1],
            "image",
          );
          storedCoverUrl = value.fileURL[1];
        } catch (error) {
          LOGGER.warn(`Cover download failed for ${downloadId}: `, error);
          deleteRelativeVideoFile(value.fileURL[1]);
        }
      } else if (coverResult?.status === "rejected") {
        LOGGER.warn(
          `Cover download failed for ${downloadId}: `,
          coverResult.reason,
        );
        deleteRelativeVideoFile(value.fileURL[1]);
      }

      const actualDurationMs =
        trackInfo.durationSeconds &&
        Number.isFinite(trackInfo.durationSeconds) &&
        trackInfo.durationSeconds > 0
          ? Math.round(trackInfo.durationSeconds * 1000)
          : source.format.approx_duration_ms;
      await insertVideo(
        downloadId,
        trackInfo.title,
        actualDurationMs,
        storedCoverUrl,
        value.fileURL[0],
        undefined,
        trackInfo.author?.name,
      );
      DeviceEventEmitter.emit(getVideoDownloadEventUpdate(downloadId), 1);
      delete downloadRefs.current[downloadId];
      LOGGER.info(`Download completed for ${downloadId}`);
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
      const current = downloadRefs.current[id];
      if (!current) {
        return;
      }
      current.process = getProgress(data);
    });
    downloadRefs.current[id] = value;

    try {
      const result = await value.download[0].downloadAsync();
      assertSuccessfulDownload(
        result,
        value.fileURL[0],
        "image",
        undefined,
        playlistDir,
      );
      LOGGER.debug(`Playlist cover downloaded to ${result.uri}`);
      await createPlaylist(id, info.title, info.description, value.fileURL[0]);
      LOGGER.debug(`Insert downloaded playlist cover for ${value.id}`);
    } finally {
      delete downloadRefs.current[id];
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
  return new File(videoDir, url).uri;
}

export function getAbsolutePlaylistURL(url: string) {
  return new File(playlistDir, url).uri;
}

export function isUsableDownloadedVideo(relativeUrl: string) {
  const file = new File(videoDir, relativeUrl);
  if (!file.exists || file.size < 12) {
    return false;
  }

  let handle;
  try {
    handle = file.open(FileMode.ReadOnly);
    const header = handle.readBytes(12);
    return String.fromCharCode(...header.slice(4, 8)) === "ftyp";
  } catch (error) {
    LOGGER.warn(`Could not validate local media file ${relativeUrl}: `, error);
    return false;
  } finally {
    handle?.close();
  }
}

function deleteRelativeVideoFile(relativeUrl: string | undefined) {
  if (!relativeUrl) {
    return;
  }
  const file = new File(videoDir, relativeUrl);
  if (file.exists) {
    file.delete();
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getProgress(data: FileSystem.DownloadProgressData) {
  if (data.totalBytesExpectedToWrite <= 0) {
    return 0;
  }
  return Math.min(1, data.totalBytesWritten / data.totalBytesExpectedToWrite);
}

function updateDownloadProgress(
  downloads: DownloadRef,
  id: string,
  index: number,
  data: FileSystem.DownloadProgressData,
  emit: boolean,
) {
  const current = downloads[id];
  if (!current) {
    return;
  }

  current.progressDownloads[index] = getProgress(data);
  current.process =
    current.progressDownloads.reduce((sum, value) => sum + value, 0) /
    current.progressDownloads.length;

  if (emit) {
    DeviceEventEmitter.emit(getVideoDownloadEventUpdate(id), current.process);
  }
}

function assertSuccessfulDownload(
  result: FileSystem.FileSystemDownloadResult | undefined,
  relativeUrl: string | undefined,
  expectedType: "audio" | "image",
  expectedBytes?: number,
  parentDirectory = videoDir,
): asserts result is FileSystem.FileSystemDownloadResult {
  if (!result) {
    throw new Error("Download was cancelled.");
  }
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Server returned HTTP ${result.status}.`);
  }
  if (!relativeUrl) {
    throw new Error("Download destination is missing.");
  }

  const contentType = (
    result.mimeType ??
    result.headers["Content-Type"] ??
    result.headers["content-type"] ??
    ""
  )
    .split(";", 1)[0]
    .toLowerCase();
  const genericBinary =
    !contentType ||
    contentType === "application/octet-stream" ||
    contentType === "binary/octet-stream";
  if (!genericBinary && !contentType.startsWith(`${expectedType}/`)) {
    throw new Error(
      `Server returned ${contentType || "an unknown content type"} instead of ${expectedType}.`,
    );
  }

  const file = new File(parentDirectory, relativeUrl);
  if (!file.exists || file.size <= 0) {
    throw new Error("The downloaded file is empty or missing.");
  }
  if (expectedBytes && file.size < expectedBytes) {
    throw new Error(
      `The downloaded file is incomplete (${file.size} of ${expectedBytes} bytes).`,
    );
  }
  if (expectedType === "audio" && !isUsableDownloadedVideo(relativeUrl)) {
    throw new Error("The server response is not a playable MP4 audio file.");
  }
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
  const downloads: DownloadResumable[] = [download];
  const fileURLs = [videoURL];

  if (coverUrl) {
    console.log("Download cover as well!");
    const coverFileURL = `${id}/cover.jpg`;
    const coverFileFullURL = new File(videoDir, coverFileURL).uri;
    downloads.push(
      FileSystem.createDownloadResumable(
        coverUrl,
        coverFileFullURL,
        undefined,
        coverUrlCallback,
      ),
    );
    fileURLs.push(coverFileURL);
  }

  return {
    id,
    download: downloads,
    fileURL: fileURLs,
    process: 0,
    progressDownloads: downloads.map(() => 0),
    type: audioOnly ? "audio" : "video",
    contentType: "video",
  } satisfies DownloadObject;
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

export function deleteVideoFilesIfExists(id: string) {
  const directory = getVideoDir(id);
  if (directory.exists) {
    directory.delete();
  }
}
