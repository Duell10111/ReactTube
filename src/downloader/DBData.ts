import * as Asset from "expo-asset";
import {Duration} from "luxon";
import {useMemo} from "react";

import {
  getAllPlaylists,
  getPlaylistVideos,
  usePlaylist,
  usePlaylists,
  usePlaylistVideos,
} from "@/downloader/DownloadDatabaseOperations";
import {Playlist, Video} from "@/downloader/schema";
import {
  ElementData,
  YTMusicPlaylist,
  YTPlaylistPanel,
  YTPlaylistPanelItem,
} from "@/extraction/Types";

const defaultImageUri = Asset.Asset.fromModule(
  require("../../assets/images/ios_icon.png"),
);

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

export function usePlaylistAsYTPlaylist(id: string): YTMusicPlaylist {
  const playlist = usePlaylist(id);
  const localData = usePlaylistVideos(id);
  console.log("LD: ", localData);

  const playlistImage = localData.find(item => item.coverUrl);

  return {
    originalData: {type: "Local"} as any,
    title: playlist?.name ?? "Unknown Playlist",
    description: undefined,
    editable: true,
    items: localData.map(item => mapVideoToElementData(item, id)),
    loadMore: async () => {},
    thumbnailImage: playlistImage ? {url: playlistImage.coverUrl} : ({} as any),
  };
}

function mapPlaylistToElementData(localPlaylist: Playlist): ElementData {
  return {
    originalNode: {type: "Local"} as any,
    type: "playlist",
    id: localPlaylist.id,
    title: localPlaylist.name ?? "Unknown Playlist",
    thumbnailImage: {
      url: defaultImageUri.uri,
      height: defaultImageUri.height,
      width: defaultImageUri.width,
    },
  };
}

function mapVideoToElementData(
  videoData: Video,
  playlistId?: string,
): ElementData {
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
    thumbnailImage: {
      url: videoData.coverUrl,
    },
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
