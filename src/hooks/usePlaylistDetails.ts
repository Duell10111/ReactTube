import {useCallback, useEffect, useState} from "react";

import Logger from "../utils/Logger";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {parseObservedArray} from "@/extraction/ArrayExtraction";
import {ElementData, YTPlaylist} from "@/extraction/Types";
import {getElementDataFromYTPlaylist} from "@/extraction/YTElements";

const LOGGER = Logger.extend("PLAYLIST");

export default function usePlaylistDetails(playlistId: string) {
  const youtube = useYoutubeContext();
  const [playlist, setPlaylist] = useState<YTPlaylist>();
  const [data, setData] = useState<ElementData[]>([]);
  const [liked, setLiked] = useState<boolean>();

  useEffect(() => {
    youtube
      ?.getPlaylist(playlistId)
      .then(p => {
        const parsedPlaylist = getElementDataFromYTPlaylist(p);
        setPlaylist(parsedPlaylist);
        setData(parseObservedArray(p.items));
        setLiked(parsedPlaylist.saved?.status);
      })
      .catch(LOGGER.warn);
  }, [youtube, playlistId]);

  // const parsedData = useMemo(() => {
  //   return data.map(getVideoData);
  // }, [data]);

  const fetchMore = useCallback(async () => {
    if (playlist?.originalData.has_continuation) {
      const update = await playlist.originalData.getContinuation();
      setPlaylist(getElementDataFromYTPlaylist(update));
      setData([...data, ...parseObservedArray(update.items)]);
    } else {
      LOGGER.warn("No Continuation available");
    }
  }, [playlist, data]);

  const togglePlaylistLike = async () => {
    console.log("Liked: ", liked);
    if (liked) {
      await youtube.playlist.removeLikePlaylist(playlistId);
    } else {
      await youtube.playlist.likePlaylist(playlistId);
    }
    setLiked(!liked);
  };

  console.log("Playlist data: ", data);

  console.log("Playlist Like: ", liked);

  return {playlist, data, fetchMore, liked, togglePlaylistLike};
}
