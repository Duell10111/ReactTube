import {useEffect, useRef, useState} from "react";

import useYoutube from "./useYoutube";

import {extractSectionList} from "@/extraction/CustomListExtractors";
import {HorizontalData} from "@/extraction/ShelfExtraction";
import Logger from "@/utils/Logger";
import {IBrowseResponse, Mixins} from "@/utils/Youtube";

const LOGGER = Logger.extend("TRENDING");

export default function useTrending() {
  const youtube = useYoutube();
  const trending = useRef<Mixins.TabbedFeed<IBrowseResponse>>(undefined);
  const continuation = useRef<Mixins.Feed<IBrowseResponse>>(undefined);
  const [data, setData] = useState<HorizontalData[]>();
  const [tabs, setTabs] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  console.log("Data: ", data);

  useEffect(() => {
    youtube
      ?.getTrending()
      .then(t => {
        trending.current = t;
        continuation.current = undefined;
        console.log("Tabs: ", t.title);
        setTabs(t.tabs);
        setCurrentIndex(t.tabs.findIndex(v => v === t.title));
        setData(extractSectionList(t.page_contents));
      })
      .catch(LOGGER.warn);
  }, [youtube]);

  const fetchMore = async () => {
    const trendRef = continuation.current ?? trending.current;
    const cont = await trendRef?.getContinuation();
    if (cont) {
      continuation.current = cont;
      setData([...(data ?? []), ...extractSectionList(cont.page_contents)]);
    } else {
      console.warn("No continuation found.");
    }
  };

  const selectTab = async (tabName: string) => {
    trending.current = await trending.current?.getTabByName(tabName);
  };

  return {trending, data, fetchMore, selectTab};
}
