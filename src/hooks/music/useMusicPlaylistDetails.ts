import {useCallback, useEffect, useMemo, useRef, useState} from "react";

import {useYoutubeContext} from "../../context/YoutubeContext";
import {getElementDataFromYTMusicPlaylist} from "../../extraction/YTElements";
import Logger from "../../utils/Logger";

import {YTNodes} from "@/utils/Youtube";

const LOGGER = Logger.extend("PLAYLIST");

export default function usePlaylistDetails(playlistId: string) {
  const youtube = useYoutubeContext();
  const [playlist, setPlaylist] =
    useState<ReturnType<typeof getElementDataFromYTMusicPlaylist>>();
  const [liked, setLiked] = useState<boolean>();

  // TODO: Outsource parse of button to extraction type! SAME FOR NORMAL Playlist!
  const saved = playlist?.originalData?.header
    ?.as(YTNodes.MusicResponsiveHeader)
    ?.buttons?.filterType(YTNodes.ToggleButton)
    ?.find(v => v.icon_type === "LIBRARY_ADD").endpoint;
  console.log("SAVED: ", saved);

  useEffect(() => {
    youtube?.music
      ?.getPlaylist(playlistId)
      .then(p => {
        const parsedPlaylist = getElementDataFromYTMusicPlaylist(p);
        setPlaylist(parsedPlaylist);
        const saved = parsedPlaylist?.originalData?.header
          ?.as(YTNodes.MusicResponsiveHeader)
          ?.buttons?.filterType(YTNodes.ToggleButton)
          ?.find(v => v.icon_type === "LIBRARY_ADD")?.is_toggled;
        setLiked(saved);
      })
      .catch(LOGGER.warn);
  }, [youtube, playlistId]);

  const fetchMore = useCallback(async () => {
    await playlist.loadMore();
    setPlaylist(playlist);
  }, [playlist]);

  const togglePlaylistLike = async () => {
    const likeEndpointPID = playlist?.originalData?.header
      ?.as(YTNodes.MusicResponsiveHeader)
      ?.buttons?.filterType(YTNodes.ToggleButton)
      ?.find(v => v.icon_type === "LIBRARY_ADD")?.endpoint?.payload
      ?.target?.playlistId;
    console.log("Liked: ", liked);
    if (liked) {
      await youtube.playlist.removeLikePlaylist(likeEndpointPID ?? playlistId);
    } else {
      await youtube.playlist.likePlaylist(likeEndpointPID ?? playlistId);
    }
    setLiked(!liked);
  };

  return {playlist, fetchMore, liked, togglePlaylistLike};
}
