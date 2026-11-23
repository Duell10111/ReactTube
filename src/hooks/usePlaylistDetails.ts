import {useCallback, useEffect, useRef, useState} from "react";

import Logger from "../utils/Logger";

import {useYoutubeContext, useYoutubeTVContext} from "@/context/YoutubeContext";
import {parseObservedArray} from "@/extraction/ArrayExtraction";
import {ElementData, YTPlaylist} from "@/extraction/Types";
import {
  getElementDataFromYTPlaylist,
  getElementDataFromYTTVPlaylist,
} from "@/extraction/YTElements";
import {isWatchLaterPlaylistId} from "@/extraction/libraryShelf";
import usePlaylistManager from "@/hooks/playlist/usePlaylistManager";
import {loadWatchLaterNewestFirst} from "@/utils/watchLater";

const LOGGER = Logger.extend("PLAYLIST");

export default function usePlaylistDetails(playlistId: string) {
  const youtube = useYoutubeContext();
  const youtubeTV = useYoutubeTVContext();
  // The page the next continuation is read from. The playlist itself keeps
  // its first page, because only that one carries the header; it is unset
  // once every page is in `data`, as for Watch later.
  const page = useRef<YTPlaylist["originalData"]>(undefined);
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
    page.current = undefined;
    youtube
      .getPlaylist(playlistId)
      .then(p => {
        const parsedPlaylist = getElementDataFromYTPlaylist(p);
        page.current = p;
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
        if (isWatchLaterPlaylistId(playlistId)) {
          // Delivered oldest first; the newest entries are the ones people
          // look for, so the whole list is loaded and reversed.
          const newest = await loadWatchLaterNewestFirst(youtubeTV, p);
          setPlaylist(getElementDataFromYTTVPlaylist(p));
          setData(newest.items);
        } else {
          page.current = p;
          setPlaylist(getElementDataFromYTTVPlaylist(p));
          setData(parseObservedArray(p.items));
        }
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
    const current = page.current;
    if (!current?.has_continuation) {
      return;
    }
    const update = await current.getContinuation();
    page.current = update;
    setData(previous => [...previous, ...parseObservedArray(update.items)]);
  }, []);

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
