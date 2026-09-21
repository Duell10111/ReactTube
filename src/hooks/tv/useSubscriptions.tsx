import {useCallback, useEffect, useRef, useState} from "react";

import {useYoutubeTVContext} from "@/context/YoutubeContext";
import {parseObservedArrayHorizontalData} from "@/extraction/ArrayExtraction";
import {HorizontalData} from "@/extraction/ShelfExtraction";
import Logger from "@/utils/Logger";
import {YTTV} from "@/utils/Youtube";

const LOGGER = Logger.extend("SUBS");

export default function useSubscriptions() {
  const youtube = useYoutubeTVContext();
  const subFeed = useRef<YTTV.SubscriptionsFeed>(undefined);
  const [data, setData] = useState<HorizontalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>();

  const fetchFeed = useCallback(() => {
    if (!youtube) {
      return;
    }

    setError(undefined);
    youtube.tv
      .getSubscriptionsFeed()
      .then(value => {
        subFeed.current = value;
        setData(parseObservedArrayHorizontalData(value.items));
      })
      .catch(reason => {
        LOGGER.warn("Error fetching subscriptions feed: ", reason);
        setError(reason);
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, [youtube]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const fetchMore = useCallback(async () => {
    if (!subFeed.current?.has_continuation) {
      LOGGER.debug("No continuation available");
      return;
    }

    const update = await subFeed.current.getContinuation();
    subFeed.current = update;
    setData(previous => [
      ...previous,
      ...parseObservedArrayHorizontalData(update.items),
    ]);
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchFeed();
  }, [fetchFeed]);

  return {
    data,
    fetchMore,
    refresh,
    refreshing,
    loading: loading || !youtube,
    error,
  };
}
