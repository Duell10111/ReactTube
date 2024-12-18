import * as Asset from "expo-asset";
import {Duration} from "luxon";
import {useEffect, useMemo, useState} from "react";

import {
  getAllPlaylists,
  getPlaylist,
  getPlaylistVideos,
  usePlaylists,
} from "@/downloader/DownloadDatabaseOperations";
import {Playlist, Video} from "@/downloader/schema";
import {
  ElementData,
  VideoData,
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

function mapPlaylistToElementData(localPlaylist: Playlist): ElementData {
  return {
    originalNode: {type: "Local"} as any,
    type: "playlist",
    id: localPlaylist.id,
    title: localPlaylist.name ?? "Unknown Playlist",
    thumbnailImage: localPlaylist.coverUrl
      ? {
          url: localPlaylist.coverUrl,
        }
      : {
          url: defaultImageUri.uri,
          height: defaultImageUri.height,
          width: defaultImageUri.width,
        },
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
