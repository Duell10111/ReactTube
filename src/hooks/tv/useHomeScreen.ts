import {useCallback, useEffect, useRef, useState} from "react";
import {DeviceEventEmitter} from "react-native";

import {useYoutubeTVContext} from "@/context/YoutubeContext";
import {parseArrayHorizontalData} from "@/extraction/ArrayExtraction";
import {HorizontalData} from "@/extraction/ShelfExtraction";
import Logger from "@/utils/Logger";
import {YTTV} from "@/utils/Youtube";

const LOGGER = Logger.extend("HOOKS");

export default function useHomeScreen() {
  const youtube = useYoutubeTVContext();
  const homePage = useRef<YTTV.HomeFeed>(undefined);
  const [content, setContent] = useState<HorizontalData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  const fetchHomeContent = useCallback(() => {
    if (youtube) {
      setError(undefined);
      youtube.tv
        .getHomeFeed()
        .then(value => {
          LOGGER.debug("Fetched HomeFeed");
          homePage.current = value;
          if (value.sections) {
            setContent(parseArrayHorizontalData(value.sections));
          }
        })
        .catch(reason => {
          LOGGER.warn("Error fetching HomeFeed: ", reason);
          setError(reason);
        })
        .finally(() => {
          setRefreshing(false);
          setLoading(false);
        });
    } else {
      LOGGER.warn("Innertube undefined");
    }
  }, [youtube]);

  useEffect(() => {
    fetchHomeContent();
  }, [youtube]);

  useEffect(() => {
    if (youtube?.session.logged_in) {
      // Refetch once
      fetchHomeContent();
    }
  }, [youtube?.session.logged_in]);

  const fetchMore = useCallback(async () => {
    // Bound to onEndReached, which fires on mount while the list is still empty
    // and again once the feed has no further pages. Neither is exceptional, so
    // return quietly instead of throwing an unhandled rejection at the list.
    if (!homePage.current) {
      LOGGER.debug("Home feed not loaded yet, skipping fetchMore");
      return;
    }
    if (!homePage.current.has_continuation) {
      LOGGER.debug("Home feed has no continuation, skipping fetchMore");
      return;
    }
    const nextContent = await homePage.current.getContinuation();
    homePage.current = nextContent;
    if (nextContent.sections) {
      setContent(prevState => {
        return [
          ...prevState,
          ...parseArrayHorizontalData(nextContent.sections!),
        ];
      });
    } else {
      LOGGER.warn("No Homepage continuation content available!");
    }
  }, [content]);

  // Listen for refresh events
  useEffect(() => {
    const listener = DeviceEventEmitter.addListener("HomeScreenRefresh", () =>
      fetchHomeContent(),
    );
    return listener.remove();
  }, [fetchHomeContent]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchHomeContent();
  }, [fetchHomeContent]);

  return {
    homePage,
    content,
    fetchMore,
    refresh,
    refreshing,
    // The first fetch only starts once the Innertube session exists, so the
    // feed stays in its loading state until then instead of showing "empty".
    loading: loading || !youtube,
    error,
  };
}
