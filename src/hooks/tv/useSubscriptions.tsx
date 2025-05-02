import {useCallback, useEffect, useRef, useState} from "react";

import {useYoutubeTVContext} from "@/context/YoutubeContext";
import {parseObservedArray} from "@/extraction/ArrayExtraction";
import {ElementData} from "@/extraction/Types";
import Logger from "@/utils/Logger";
import {YTTV} from "@/utils/Youtube";

const LOGGER = Logger.extend("SUBS");

export default function useSubscriptions() {
  const youtube = useYoutubeTVContext();
  const subFeed = useRef<YTTV.SubscriptionsFeed>();
  const [data, setData] = useState<ElementData[]>([]);

  useEffect(() => {
    youtube?.tv
      ?.getSubscriptionsFeed()
      .then(value => {
        subFeed.current = value;
        setData(parseObservedArray(value.items));
      })
      .catch(console.warn);
  }, []);

  const fetchMore = useCallback(async () => {
    if (subFeed.current?.has_continuation) {
      const update = await subFeed.current.getContinuation();
      subFeed.current = update;
      setData([...data, ...parseObservedArray(update.items)]);
    } else {
      LOGGER.warn("No Continuation available");
    }
  }, [data]);

  return {data, fetchMore};
}
