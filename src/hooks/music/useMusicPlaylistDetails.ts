import {useCallback, useEffect, useState} from "react";

import Logger from "../../utils/Logger";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {isLocalPlaylist, usePlaylistAsYTPlaylist} from "@/downloader/DBData";
import {ElementData} from "@/extraction/Types";
import {getElementDataFromYTMusicPlaylist} from "@/extraction/YTElements";
import usePlaylistManager from "@/hooks/playlist/usePlaylistManager";

const LOGGER = Logger.extend("PLAYLIST");

export default function usePlaylistDetails(playlistId: string) {
  const youtube = useYoutubeContext();
  const [playlist, setPlaylist] =
    useState<ReturnType<typeof getElementDataFromYTMusicPlaylist>>();
  const [liked, setLiked] = useState<boolean>();

  const {removeVideoFromPlaylist} = usePlaylistManager();

  // Local version
  const localData = usePlaylistAsYTPlaylist(playlistId);

  useEffect(() => {
    youtube?.music
      ?.getPlaylist(playlistId)
      .then(p => {
        const parsedPlaylist = getElementDataFromYTMusicPlaylist(p);
        setPlaylist(parsedPlaylist);
        setLiked(parsedPlaylist.saved?.status);
      })
      .catch(LOGGER.warn);
  }, [youtube, playlistId]);

  const fetchMore = useCallback(async () => {
    await playlist.loadMore();
    setPlaylist(playlist);
  }, [playlist]);

  const togglePlaylistLike = async () => {
    console.log("Liked: ", liked);
    if (liked) {
      await youtube.playlist.removeLikePlaylist(
        playlist?.saved?.saveID ?? playlistId,
      );
    } else {
      await youtube.playlist.likePlaylist(
        playlist?.saved?.saveID ?? playlistId,
      );
    }
    setLiked(!liked);
  };

  const deleteItemFromPlaylist = async (item: ElementData) => {
    await removeVideoFromPlaylist([item.id], playlistId);
  };

  console.log("Local Playlist: ", localData);

  return {
    playlist: isLocalPlaylist(playlistId) ? localData : playlist,
    fetchMore,
    liked,
    togglePlaylistLike,
    deleteItemFromPlaylist,
  };
}
