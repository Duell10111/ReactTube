import _ from "lodash";
import {useCallback, useEffect, useRef, useState} from "react";

import {useYoutubeTVContext} from "@/context/YoutubeContext";
import {parseObservedArray} from "@/extraction/ArrayExtraction";
import {ElementData, YTMyYoutubeTab} from "@/extraction/Types";
import {parseYTMyYoutubeTab} from "@/extraction/YTElements";
import Logger from "@/utils/Logger";
import {YTTV} from "@/utils/Youtube";

const LOGGER = Logger.extend("My_YouTube");

export default function useMyYoutubeScreen() {
  const youtube = useYoutubeTVContext();
  const myYoutubeFeed = useRef<YTTV.MyYoutubeFeed>(undefined);
  const [data, setData] = useState<ElementData[]>([]);
  const [tabs, setTabs] = useState<YTMyYoutubeTab[]>([]);
  const myYoutubeFeedSelection = useRef<YTTV.MyYoutubeFeed>(undefined);
  const [selectionData, setSelectionData] = useState<ElementData[]>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    if (!youtube) {
      return;
    }

    youtube.tv
      ?.getMyYoutubeFeed()
      .then(value => {
        myYoutubeFeed.current = value;
        setData(parseObservedArray(value.items));
        value.tabs &&
          setTabs(
            _.chain(value.tabs).map(parseYTMyYoutubeTab).compact().value(),
          );
      })
      .catch(reason => {
        LOGGER.warn("Error fetching My YouTube feed: ", reason);
        setError(reason);
      })
      .finally(() => setLoading(false));
  }, [youtube]);

  const fetchMore = useCallback(async () => {
    if (myYoutubeFeedSelection.current?.has_continuation) {
      const update = await myYoutubeFeedSelection.current.getContinuation();
      myYoutubeFeedSelection.current = update;
      setSelectionData(previous => {
        return [...(previous ?? []), ...parseObservedArray(update.items)];
      });
    } else if (myYoutubeFeed.current?.has_continuation) {
      const update = await myYoutubeFeed.current.getContinuation();
      myYoutubeFeed.current = update;
      setData(previous => {
        return [...(previous ?? []), ...parseObservedArray(update.items)];
      });
    } else {
      LOGGER.warn("No Continuation available");
    }
  }, []);

  // TODO: Implement this and add parser for MyYoutubeScreen
  const selectTab = (tab: YTMyYoutubeTab) => {
    console.log("selectTab", tab);
    myYoutubeFeed.current
      ?.selectTab(tab.originalData)
      .then(value => {
        myYoutubeFeedSelection.current = value;
        setSelectionData(parseObservedArray(value.items));
      })
      .catch(LOGGER.warn);
  };

  return {
    data: selectionData ?? data,
    tabs,
    fetchMore,
    selectTab,
    loading: loading || !youtube,
    error,
  };
}
