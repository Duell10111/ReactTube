import {useMemo} from "react";

import {useFeedData} from "./general/useFeedData";
import Logger from "../utils/Logger";

import {parseArrayHorizontalAndElement} from "@/extraction/ArrayExtraction";

const LOGGER = Logger.extend("SUBS");

export default function useHistory() {
  const {content, contentFetched, fetchMore, setFeed, feed} = useFeedData(
    youtube => youtube.getHistory(),
  );

  const parsedContent = useMemo(() => {
    return parseArrayHorizontalAndElement(content);
  }, [content]);

  console.log(content.length);

  return {content, fetchMore, parsedContent};
}
