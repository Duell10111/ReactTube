import {useCallback, useEffect, useRef, useState} from "react";

import Logger from "../utils/Logger";

import {useYoutubeContext, useYoutubeTVContext} from "@/context/YoutubeContext";
import {parseObservedArray} from "@/extraction/ArrayExtraction";
import {ElementData, YTPlaylist} from "@/extraction/Types";
import {
  getElementDataFromYTPlaylist,
  getElementDataFromYTTVPlaylist,
} from "@/extraction/YTElements";
import usePlaylistManager from "@/hooks/playlist/usePlaylistManager";

const LOGGER = Logger.extend("PLAYLIST");

export default function usePlaylistDetails(playlistId: string) {
  const youtube = useYoutubeContext();
  const youtubeTV = useYoutubeTVContext();
  // Which session the playlist came from, so its pages parse the same way.
  const source = useRef<"classic" | "tv">("classic");
  const [playlist, setPlaylist] = useState<YTPlaylist>();
  const [data, setData] = useState<ElementData[]>([]);
  const [liked, setLiked] = useState<boolean>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>();
  const {addPlaylistToLibrary, removePlaylistFromLibrary} =
    usePlaylistManager();

  const reload = useCallback(() => {
    if (!youtube) {
      return;
    }

    setLoading(true);
    setError(undefined);
    youtube
      .getPlaylist(playlistId)
      .then(p => {
        const parsedPlaylist = getElementDataFromYTPlaylist(p);
        source.current = "classic";
        setPlaylist(parsedPlaylist);
        setData(parseObservedArray(p.items));
        setLiked(parsedPlaylist.saved?.status);
      })
      .catch(async classicError => {
        // Only the TV session is signed in. The classic one reports private
        // playlists such as Watch later or Liked videos as nonexistent.
        if (!youtubeTV?.tv) {
          throw classicError;
        }
        LOGGER.debug(
          `Playlist ${playlistId} not available to the classic session, trying the TV session`,
        );
        const p = await youtubeTV.tv.getPlaylist(playlistId);
        source.current = "tv";
        setPlaylist(getElementDataFromYTTVPlaylist(p));
        setData(parseObservedArray(p.items));
        // The TV playlist carries no save state, which hides the button.
        setLiked(undefined);
      })
      .catch(loadError => {
        setError(loadError);
        LOGGER.warn(loadError);
      })
      .finally(() => setLoading(false));
  }, [youtube, youtubeTV, playlistId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // const parsedData = useMemo(() => {
  //   return data.map(getVideoData);
  // }, [data]);

  const fetchMore = useCallback(async () => {
    if (playlist?.originalData.has_continuation) {
      const update = await playlist.originalData.getContinuation();
      setPlaylist(
        source.current === "tv"
          ? // @ts-ignore
            getElementDataFromYTTVPlaylist(update)
          : // @ts-ignore
            getElementDataFromYTPlaylist(update),
      );
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

  console.log("Playlist data: ", data);

  console.log("Playlist Like: ", liked);

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
