import {useEffect, useRef, useState} from "react";

import {useFeedData} from "./general/useFeedData";
import Logger from "../utils/Logger";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {YTLibrary} from "@/extraction/Types";
import {getElementDataFromYTLibrary} from "@/extraction/YTElements";
import {YT} from "@/utils/Youtube";

const LOGGER = Logger.extend("LIBRARY");

export default function useLibrary() {
  const youtube = useYoutubeContext();
  const library = useRef<YT.Library>(undefined);
  const [data, setData] = useState<YTLibrary>();

  console.log("DATA: ", data);

  useEffect(() => {
    youtube
      ?.getLibrary()
      .then(async lib => {
        console.log("Fetching library");
        // console.log("Lib: ", JSON.stringify(lib, null, 4));
        library.current = lib;
        setData(await getElementDataFromYTLibrary(lib));
      })
      .catch(LOGGER.warn);
  }, []);

  // TODO: Remove below once migrated
  const {content, fetchMore, parsedContent} = useFeedData(async yt => {
    const lib = await yt.getLibrary();
    // const rtn = library?.history() ?? library;
    return lib;
  });

  // return {content: [], fetchMore: () => {}, parsedContent: [], data};
  return {content, fetchMore, parsedContent, data};
}
