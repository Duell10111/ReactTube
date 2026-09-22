import {useCallback, useEffect, useRef, useState} from "react";

import {YTMusic} from "../../utils/Youtube";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {parseObservedArrayHorizontalData} from "@/extraction/ArrayExtraction";
import {HorizontalData} from "@/extraction/ShelfExtraction";

export default function useMusicHome() {
  const homeData = useRef<YTMusic.HomeFeed>(undefined);
  const youtube = useYoutubeContext();
  const [data, setData] = useState<HorizontalData[]>();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  const fetchData = useCallback(() => {
    if (!youtube?.music) {
      return;
    }

    setError(undefined);
    youtube.music
      .getHomeFeed()
      .then(homeFeed => {
        homeData.current = homeFeed;
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

  return {
    data,
    fetchContinuation,
    refreshing,
    refresh,
    loading,
    error,
  };
}
