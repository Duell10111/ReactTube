import _ from "lodash";
import {useCallback, useEffect, useState} from "react";
import {DeviceEventEmitter} from "react-native";

import Logger from "../utils/Logger";
import {
  YT,
  Helpers,
  YTNodes,
  AppendContinuationItemsAction,
} from "../utils/Youtube";

import {useYoutubeContext} from "@/context/YoutubeContext";

const LOGGER = Logger.extend("HOOKS");

export default function useHomeScreen() {
  const youtube = useYoutubeContext();
  const [homePage, setHomePage] = useState<YT.HomeFeed>();
  const [content, setContent] = useState<Helpers.YTNode[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // console.log("MEMO: ", homePage?.memo.size);

  // TODO: Optimize
  // const parsedData = useMemo(() => {
  //   return parseArrayHorizontalAndElement(content);
  // }, [content]);

  const fetchHomeContent = useCallback(() => {
    if (youtube) {
      youtube
        .getHomeFeed()
        .then(value => {
          LOGGER.debug("Fetched HomeFeed");
          // console.log("Value: ", JSON.stringify(value, null, 2));
          setHomePage(value);
          if (value.contents?.is(YTNodes.RichGrid)) {
            setContent(value.contents.contents);
          }
          console.log("Page Content: ", value.page_contents.type);
          console.log(
            "Page Content Size:",
            value.page_contents.as(YTNodes.RichGrid).contents.length,
          );
        })
        .catch(reason => {
          LOGGER.warn("Error fetching HomeFeed: ", reason);
        })
        .finally(() => setRefreshing(false));
    }
  }, [youtube]);

  useEffect(() => {
    fetchHomeContent();
  }, [youtube]);

  useEffect(() => {
    if (youtube?.session.logged_in) {
      // Refetch once
      fetchHomeContent();
    }
  }, [youtube?.session.logged_in]);

  const fetchMore = useCallback(async () => {
    if (!homePage) {
      throw new Error("No Homepage available!");
    }
    if (!homePage.has_continuation) {
      throw new Error("No Continuation available!");
    }
    const nextContent = await homePage.getContinuation();
    // LOGGER.debug("Fetched Content: ", JSON.stringify(nextContent, null, 4));
    if (nextContent.contents?.is(AppendContinuationItemsAction)) {
      LOGGER.debug("Append Item Fetched");
      if (nextContent.contents.contents) {
        const newValues = _.concat(content, nextContent.contents.contents);
        setContent(newValues);
      } else {
        LOGGER.warn("Continue content empty!");
      }
    } else {
      console.warn("Unknown Home Type: ", nextContent.contents?.type);
    }
    setHomePage(nextContent);
  }, [homePage, content]);

  // Listen for refresh events
  useEffect(() => {
    const listener = DeviceEventEmitter.addListener("HomeScreenRefresh", () =>
      fetchHomeContent(),
    );
    return listener.remove();
  }, [fetchHomeContent]);

  const refresh = () => {
    setRefreshing(true);
    fetchHomeContent();
  };

  return {homePage, content, fetchMore, refresh, refreshing};
}
