import {useCallback, useEffect, useRef, useState} from "react";

import {useYoutubeTVContext} from "@/context/YoutubeContext";
import {parseArray} from "@/extraction/ArrayExtraction";
import {ElementData} from "@/extraction/Types";
import Logger from "@/utils/Logger";
import {YTTV} from "@/utils/Youtube";

const LOGGER = Logger.extend("PLAYLISTS");

export default function usePlaylists() {
  const youtube = useYoutubeTVContext();
  const playlistFeed = useRef<YTTV.PlaylistsFeed>(undefined);
  const [data, setData] = useState<ElementData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>();

  const fetchPlaylists = useCallback(() => {
    if (!youtube) {
      return;
    }

    setError(undefined);
    youtube.tv
      .getPlaylists()
      .then(feed => {
        playlistFeed.current = feed;

        if (feed.contents) {
          setData(parseArray(feed.contents));
        }
      })
      .catch(reason => {
        LOGGER.warn("Error fetching playlists: ", reason);
        setError(reason);
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, [youtube]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  const fetchMore = useCallback(async () => {
    if (!playlistFeed.current?.has_continuation) {
      return;
    }

    const continuation = await playlistFeed.current.getContinuation();
    playlistFeed.current = continuation;

    if (continuation.contents) {
      setData(parseArray(continuation.contents));
    }
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchPlaylists();
  }, [fetchPlaylists]);

  return {
    data,
    fetchMore,
    refresh,
    refreshing,
    loading: loading || !youtube,
    error,
  };
}
