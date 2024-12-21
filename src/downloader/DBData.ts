import * as Asset from "expo-asset";
import {Duration} from "luxon";
import {useEffect, useMemo, useState} from "react";

import {
  getAllPlaylists,
  getPlaylist,
  getPlaylistVideos,
  usePlaylists,
  useVideos as useVideosDB,
  useDownloadedVideos as useDownloadedVideosDB,
  findVideo,
  deleteVideo as deleteVideoDB,
  deleteVideoLocalFileReferences,
  checkIfVideoIsInPlaylist,
} from "@/downloader/DownloadDatabaseOperations";
import {Playlist, Video} from "@/downloader/schema";
import {
  ElementData,
  Thumbnail,
  VideoData,
  YTMusicPlaylist,
  YTPlaylistPanel,
  YTPlaylistPanelItem,
  YTTrackInfo,
} from "@/extraction/Types";
import {
  deleteVideoFilesIfExists,
  getAbsoluteVideoURL,
} from "@/hooks/downloader/useDownloadProcessor";

const defaultImageUri = Asset.Asset.fromModule(
  require("../../assets/images/ios_icon.png"),
);

const defaultThumbnail: Thumbnail = {
  url: defaultImageUri.uri,
  // @ts-ignore Ignore not available
  height: defaultImageUri.height,
  // @ts-ignore Ignore not available
  width: defaultImageUri.width,
};

export async function getTrackInfoForVideo(id: string) {
  const video = await findVideo(id);
  return video ? mapVideoToTrackInfo(video) : video;
}

export function useVideos() {
  const videos = useVideosDB();
  return videos.map(video => mapVideoToElementData(video));
}

export function useDownloadedVideos() {
  const videos = useDownloadedVideosDB();
  return videos.map(video => mapVideoToElementData(video));
}

export async function deleteVideo(id: string, deleteVideoRecursive = false) {
  // TODO: Create option to only delete Video file version
  const inPlaylist = await checkIfVideoIsInPlaylist(id);

  await deleteVideoFilesIfExists(id);
  if (deleteVideoRecursive || !inPlaylist) {
    await deleteVideoDB(id);
  } else {
    await deleteVideoLocalFileReferences(id);
  }
}

// Playlists

export function usePlaylistsAsElementData() {
  const playlists = usePlaylists();
  return useMemo(() => playlists.map(mapPlaylistToElementData), [playlists]);
}

export async function getAllPlaylistsAsElementData() {
  const playlists = await getAllPlaylists();
  return playlists.map(mapPlaylistToElementData);
}

export function isLocalPlaylist(id: string) {
  return id.startsWith("LC-");
}

export async function getUpNextForVideoWithPlaylist(
  videoId: string,
  playlistId: string,
) {
  const playlist = await getPlaylistVideos(playlistId);

  const items = playlist.map(video => {
    const v = mapVideoToYTPlaylistPanelItem(video, playlistId);
    return v;
  });

  return {
    originalData: {} as any,
    items,
    localPlaylist: true,
  } as YTPlaylistPanel;
}

export async function getPlaylistAsYTPlaylist(id: string) {
  const playlist = await getPlaylist(id);
  const localData = await getPlaylistVideos(id);

  const playlistImage =
    playlist?.coverUrl || localData?.find(item => item.coverUrl)?.coverUrl;

  return {
    originalData: {type: "Local"} as any,
    title: playlist?.name ?? "Unknown Playlist",
    description: playlist.description ?? undefined,
    editable: true,
    items: localData?.map(item => mapVideoToElementData(item, id)) ?? [],
    loadMore: async () => {},
    thumbnailImage: playlistImage ? {url: playlistImage} : ({} as any),
    saved: {
      saveID: id,
      status: true, // Local playlist is always saved on this point
    },
  };
}

export function usePlaylistAsYTPlaylist(
  id: string,
  onFetchPlaylist: (playlist: Playlist) => void,
): YTMusicPlaylist | null {
  // const playlist = usePlaylist(id);
  // const localData = usePlaylistVideos(id);
  const [playlist, setPlaylist] = useState<Playlist>();
  const [localData, setPlaylistVideos] = useState<Video[]>();

  useEffect(() => {
    getPlaylist(id).then(p => {
      setPlaylist(p);
      onFetchPlaylist(p);
    });
    getPlaylistVideos(id).then(setPlaylistVideos);
  }, []);

  const playlistImage = useMemo(() => {
    return (
      playlist?.coverUrl || localData?.find(item => item.coverUrl)?.coverUrl
    );
  }, [playlist, localData]);

  if (!playlist) {
    return null;
  }

  return {
    originalData: {type: "Local"} as any,
    title: playlist?.name ?? "Unknown Playlist",
    description: playlist.description ?? undefined,
    editable: true,
    items: localData?.map(item => mapVideoToElementData(item, id)) ?? [],
    loadMore: async () => {},
    thumbnailImage: playlistImage ? {url: playlistImage} : ({} as any),
    saved: {
      saveID: id,
      status: true, // Local playlist is always saved on this point
    },
  };
}

// Mappers

function mapPlaylistToElementData(localPlaylist: Playlist): ElementData {
  return {
    originalNode: {type: "Local"} as any,
    type: "playlist",
    id: localPlaylist.id,
    title: localPlaylist.name ?? "Unknown Playlist",
    thumbnailImage: localPlaylist.coverUrl
      ? {
          url: mapCoverURLToImageURL(localPlaylist.coverUrl),
        }
      : defaultThumbnail,
  };
}

function mapVideoToElementData(
  videoData: Video,
  playlistId?: string,
): VideoData {
  return {
    originalNode: {type: "Local"} as any,
    type: "video",
    id: videoData.id,
    title: videoData.name ?? "Unknown title",
    // @ts-ignore ID currently not known
    author: {name: videoData.author},
    duration: videoData.duration
      ? Duration.fromObject({seconds: videoData.duration}).toFormat("mm:ss")
      : undefined,
    durationSeconds: videoData.duration ?? undefined,
    // @ts-ignore No height or width available
    thumbnailImage: videoData.coverUrl
      ? {
          url: mapCoverURLToImageURL(videoData.coverUrl),
        }
      : defaultThumbnail,
    localPlaylistId: playlistId,
  };
}

function mapVideoToYTPlaylistPanelItem(
  videoData: Video,
  playlistId?: string,
): YTPlaylistPanelItem {
  const data = mapVideoToElementData(videoData, playlistId);

  return {
    ...data,
    selected: false,
  };
}

function mapVideoToTrackInfo(videoData: Video): YTTrackInfo {
  return {
    // @ts-ignore Ignore missing data
    originalData: {
      type: "Local",
      // @ts-ignore Ignore missing data
      streaming_data: {
        hls_manifest_url: videoData.fileUrl
          ? getAbsoluteVideoURL(videoData.fileUrl)
          : undefined,
      },
    },
    id: videoData.id,
    title: videoData.name ?? "Unknown title",
    durationSeconds: videoData.duration ?? undefined,
    // @ts-ignore Ignore issue with no height and width for cover available
    thumbnailImage: videoData.coverUrl
      ? {
          url: mapCoverURLToImageURL(videoData.coverUrl),
        }
      : defaultThumbnail,
  };
}

function mapCoverURLToImageURL(coverUrl: string) {
  if (coverUrl.startsWith("http")) {
    return coverUrl;
  }
  return getAbsoluteVideoURL(coverUrl);
}
