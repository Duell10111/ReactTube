import {useCallback, useEffect, useState} from "react";

import {useYoutubeTVContext} from "@/context/YoutubeContext";
import {parseObservedArray} from "@/extraction/ArrayExtraction";
import {ElementData, YTPlaylist} from "@/extraction/Types";
import {getElementDataFromYTTVPlaylist} from "@/extraction/YTElements";
import usePlaylistManager from "@/hooks/playlist/usePlaylistManager";
import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("PLAYLIST");

export default function usePlaylistDetails(playlistId: string) {
  const youtube = useYoutubeTVContext();
  const [playlist, setPlaylist] = useState<YTPlaylist>();
  const [data, setData] = useState<ElementData[]>([]);
  const [liked, setLiked] = useState<boolean>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>();
  const {addPlaylistToLibrary, removePlaylistFromLibrary} =
    usePlaylistManager();

  const reload = useCallback(() => {
    if (!youtube?.tv) {
      return;
    }

    setLoading(true);
    setError(undefined);
    youtube.tv
      .getPlaylist(playlistId)
      .then(p => {
        const parsedPlaylist = getElementDataFromYTTVPlaylist(p);
        setPlaylist(parsedPlaylist);
        setData(parseObservedArray(p.items));
        // setLiked(parsedPlaylist.saved?.status);
      })
      .catch(loadError => {
        setError(loadError);
        LOGGER.warn(loadError);
      })
      .finally(() => setLoading(false));
  }, [youtube, playlistId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const fetchMore = useCallback(async () => {
    if (playlist?.originalData.has_continuation) {
      const update = await playlist.originalData.getContinuation();
      // @ts-ignore
      setPlaylist(getElementDataFromYTTVPlaylist(update));
      setData([...data, ...parseObservedArray(update.items)]);
    } else {
      LOGGER.warn("No Continuation available");
    }
  }, [playlist, data]);

  const togglePlaylistLike = async () => {
    console.log("Liked: ", liked);
    if (liked) {
      await removePlaylistFromLibrary(playlistId);
    } else {
      await addPlaylistToLibrary(playlistId);
    }
    setLiked(!liked);
  };

  return {
    playlist,
    data,
    fetchMore,
    liked,
    togglePlaylistLike,
    loading,
    error,
    reload,
  };
}
