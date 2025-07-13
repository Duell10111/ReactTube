import {useCallback, useEffect, useRef, useState} from "react";
import {DeviceEventEmitter} from "react-native";

import {useYoutubeTVContext} from "@/context/YoutubeContext";
import {parseArrayHorizontalData} from "@/extraction/ArrayExtraction";
import {HorizontalData} from "@/extraction/ShelfExtraction";
import Logger from "@/utils/Logger";
import {YTTV} from "@/utils/Youtube";

const LOGGER = Logger.extend("HOOKS");

export default function useHomeScreen() {
  const youtube = useYoutubeTVContext();
  const homePage = useRef<YTTV.HomeFeed>(undefined);
  const [content, setContent] = useState<HorizontalData[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHomeContent = useCallback(() => {
    if (youtube) {
      youtube.tv
        .getHomeFeed()
        .then(value => {
          LOGGER.debug("Fetched HomeFeed");
          homePage.current = value;
          console.log(value.sections);
          if (value.sections) {
            setContent(parseArrayHorizontalData(value.sections));
          }
        })
        .catch(reason => {
          LOGGER.warn("Error fetching HomeFeed: ", reason);
        })
        .finally(() => setRefreshing(false));
    } else {
      LOGGER.warn("Innertube undefined");
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
    if (!homePage.current) {
      throw new Error("No Homepage available!");
    }
    if (!homePage.current?.has_continuation) {
      throw new Error("No Continuation available!");
    }
    const nextContent = await homePage.current.getContinuation();
    homePage.current = nextContent;
    if (nextContent.sections) {
      setContent(prevState => {
        return [
          ...prevState,
          ...parseArrayHorizontalData(nextContent.sections!),
        ];
      });
    } else {
      LOGGER.warn("No Homepage continuation content available!");
    }
  }, [content]);

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

  return {
    homePage,
    content,
    fetchMore,
    refresh,
    refreshing,
  };
}
