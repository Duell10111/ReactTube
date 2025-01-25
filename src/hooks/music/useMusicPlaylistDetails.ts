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

  const {
    removeVideoFromPlaylist,
    addPlaylistToLibrary,
    removePlaylistFromLibrary,
  } = usePlaylistManager();

  useEffect(() => {
    if (isLocalPlaylist(playlistId)) {
      getPlaylistAsYTPlaylist(playlistId).then(p => {
        setPlaylist(p);
        setLiked(p.saved.status);
      });
    } else {
      youtube?.music
        ?.getPlaylist(playlistId)
        .then(p => {
          const parsedPlaylist = getElementDataFromYTMusicPlaylist(p);
          setPlaylist(parsedPlaylist);
          setLiked(parsedPlaylist.saved?.status);
        })
        .catch(LOGGER.warn);
    }
  }, [youtube, playlistId]);

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
