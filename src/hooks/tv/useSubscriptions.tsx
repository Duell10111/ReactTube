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

  useEffect(() => {
    youtube?.tv
      ?.getSubscriptionsFeed()
      .then(value => {
        subFeed.current = value;
        setData(parseObservedArrayHorizontalData(value.items));
      })
      .catch(console.warn);
  }, []);

  const fetchMore = useCallback(async () => {
    if (subFeed.current?.has_continuation) {
      const update = await subFeed.current.getContinuation();
      subFeed.current = update;
      setData([...data, ...parseObservedArrayHorizontalData(update.items)]);
    } else {
      LOGGER.warn("No Continuation available");
    }
  }, [data]);

  return {data, fetchMore};
}
