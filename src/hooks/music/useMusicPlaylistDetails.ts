import {useCallback, useEffect, useState} from "react";

import Logger from "../../utils/Logger";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {getPlaylistAsYTPlaylist, isLocalPlaylist} from "@/downloader/DBData";
import {ElementData} from "@/extraction/Types";
import {getElementDataFromYTMusicPlaylist} from "@/extraction/YTElements";
import usePlaylistManager from "@/hooks/playlist/usePlaylistManager";

const LOGGER = Logger.extend("PLAYLIST");

export default function usePlaylistDetails(playlistId: string) {
  const youtube = useYoutubeContext();
  const [playlist, setPlaylist] =
    useState<ReturnType<typeof getElementDataFromYTMusicPlaylist>>();
  const [liked, setLiked] = useState<boolean>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  const {
    removeVideoFromPlaylist,
    addPlaylistToLibrary,
    removePlaylistFromLibrary,
  } = usePlaylistManager();

  const reload = useCallback(() => {
    setLoading(true);
    setError(undefined);
    const request = isLocalPlaylist(playlistId)
      ? getPlaylistAsYTPlaylist(playlistId)
      : youtube?.music
          ?.getPlaylist(playlistId)
          .then(getElementDataFromYTMusicPlaylist);

    if (!request) {
      return;
    }

    request
      .then(parsedPlaylist => {
        setPlaylist(parsedPlaylist);
        setLiked(parsedPlaylist.saved?.status);
      })
      .catch(loadError => {
        setError(loadError);
        LOGGER.warn(loadError);
      })
      .finally(() => setLoading(false));
  }, [playlistId, youtube]);

  useEffect(() => {
    reload();
  }, [reload]);

  const fetchMore = useCallback(async () => {
    if (playlist) {
      await playlist.loadMore();
      setPlaylist(playlist);
    } else {
      LOGGER.warn("No Playlist available for fetchMore!");
    }
  }, [playlist]);

  const togglePlaylistLike = async () => {
    console.log("Liked: ", liked);
    if (liked) {
      await removePlaylistFromLibrary(playlist?.saved?.saveID ?? playlistId);
    } else {
      await addPlaylistToLibrary(playlist?.saved?.saveID ?? playlistId);
    }
    setLiked(!liked);
  };

  const deleteItemFromPlaylist = async (item: ElementData) => {
    await removeVideoFromPlaylist([item.id], playlistId);
  };

  return {
    playlist,
    fetchMore,
    liked,
    togglePlaylistLike,
    deleteItemFromPlaylist,
    loading,
    error,
    reload,
  };
}

export async function getMusicPlaylistDetails(
  playlistId: string,
  youtube: ReturnType<typeof useYoutubeContext>,
) {
  if (isLocalPlaylist(playlistId)) {
    return getPlaylistAsYTPlaylist(playlistId);
  } else {
    if (!youtube) {
      throw new Error("Innertube object is undefined!");
    }
    const playlist = await youtube.music.getPlaylist(playlistId);
    return getElementDataFromYTMusicPlaylist(playlist);
  }
}
