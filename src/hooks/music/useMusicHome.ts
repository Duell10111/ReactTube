import {useCallback, useEffect, useRef, useState} from "react";

import {YTMusic} from "../../utils/Youtube";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {parseObservedArrayHorizontalData} from "@/extraction/ArrayExtraction";
import {HorizontalData} from "@/extraction/ShelfExtraction";

export default function useMusicHome() {
  const homeData = useRef<YTMusic.HomeFeed>(undefined);
  /**
   * The unfiltered feed. A filter chip is applied against it rather than
   * against whatever is on screen, so switching moods never has to go through
   * the unfiltered feed first.
   */
  const baseData = useRef<YTMusic.HomeFeed>(undefined);
  const youtube = useYoutubeContext();
  const [data, setData] = useState<HorizontalData[]>();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>();
  const [filters, setFilters] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>();

  const fetchData = useCallback(() => {
    if (!youtube?.music) {
      return;
    }

    setError(undefined);
    youtube.music
      .getHomeFeed()
      .then(homeFeed => {
        homeData.current = homeFeed;
        baseData.current = homeFeed;
        setFilters(homeFeed.filters);
        setActiveFilter(undefined);
        setData(extractData(homeFeed));
      })
      .catch(setError)
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, [youtube]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const extractData = (homeFeed: YTMusic.HomeFeed) => {
    return homeFeed.sections
      ? parseObservedArrayHorizontalData(homeFeed.sections)
      : [];
  };

  const fetchContinuation = () => {
    if (homeData.current?.has_continuation) {
      homeData.current.getContinuation().then(home => {
        homeData.current = home;
        setData([...(data ?? []), ...extractData(home)]);
      });
    }
  };

  const refresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const applyFilter = useCallback(
    (filter: string) => {
      const feed = baseData.current;

      if (!feed) {
        return;
      }

      // The chip row has no separate "all" entry: pressing the active chip is
      // what takes the feed back to its unfiltered state.
      if (filter === activeFilter) {
        setLoading(true);
        fetchData();
        return;
      }

      setLoading(true);
      setError(undefined);
      feed
        .applyFilter(filter)
        .then(filtered => {
          homeData.current = filtered;
          setActiveFilter(filter);
          setData(extractData(filtered));
        })
        .catch(setError)
        .finally(() => setLoading(false));
    },
    [activeFilter, fetchData],
  );

  return {
    data,
    fetchContinuation,
    refreshing,
    refresh,
    loading,
    error,
    filters,
    activeFilter,
    applyFilter,
  };
}
