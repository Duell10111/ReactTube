import {useEffect, useRef, useState} from "react";

import useYoutube from "./useYoutube";

import {extractSectionList} from "@/extraction/CustomListExtractors";
import {HorizontalData} from "@/extraction/ShelfExtraction";
import Logger from "@/utils/Logger";
import {IBrowseResponse, Mixins} from "@/utils/Youtube";

const LOGGER = Logger.extend("TRENDING");

export default function useTrending() {
  const youtube = useYoutube();
  const trending = useRef<Mixins.TabbedFeed<IBrowseResponse>>();
  const [data, setData] = useState<HorizontalData[]>([]);

  useEffect(() => {
    youtube
      ?.getTrending()
      .then(t => {
        trending.current = t;
        setData(extractSectionList(t.page_contents));
      })
      .catch(LOGGER.warn);
  }, [youtube]);

  return {trending, data};
}
