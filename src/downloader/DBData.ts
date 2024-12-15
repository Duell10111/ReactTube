import * as Asset from "expo-asset";
import {Duration} from "luxon";
import {useMemo} from "react";

import {
  getAllPlaylists,
  usePlaylist,
  usePlaylists,
  usePlaylistVideos,
} from "@/downloader/DownloadDatabaseOperations";
import {Playlist, Video} from "@/downloader/schema";
import {ElementData, YTMusicPlaylist} from "@/extraction/Types";

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

export function usePlaylistAsYTPlaylist(id: string): YTMusicPlaylist {
  const playlist = usePlaylist(id);
  const localData = usePlaylistVideos(id);
  console.log("LD: ", localData);

  const playlistImage = localData.find(item => item.coverUrl);

  return {
    originalData: {} as any,
    title: playlist?.name,
    description: undefined,
    editable: true,
    items: localData.map(mapVideoToElementData),
    loadMore: async () => {},
    thumbnailImage: playlistImage ? {url: playlistImage.coverUrl} : ({} as any),
  };
}

function mapPlaylistToElementData(localPlaylist: Playlist): ElementData {
  return {
    originalNode: {} as any,
    type: "playlist",
    id: localPlaylist.id,
    title: localPlaylist.name,
    thumbnailImage: {
      url: defaultImageUri.uri,
      height: defaultImageUri.height,
      width: defaultImageUri.width,
    },
  };
}

function mapVideoToElementData(videoData: Video): ElementData {
  return {
    originalNode: {} as any,
    type: "video",
    id: videoData.id,
    title: videoData.name,
    // @ts-ignore ID currently not known
    author: {name: videoData.author},
    duration: videoData.duration
      ? Duration.fromMillis(videoData.duration)
          .shiftTo("hours", "minutes", "seconds")
          .toHuman()
      : undefined,
    durationSeconds: videoData.duration,
    // @ts-ignore No height or width available
    thumbnailImage: {
      url: videoData.coverUrl,
    },
  };
}
