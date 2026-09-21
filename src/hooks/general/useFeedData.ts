import {useCallback, useEffect, useMemo, useState} from "react";

import {useYoutubeContext} from "../../context/YoutubeContext";
import Logger from "../../utils/Logger";
import {
  Helpers,
  YTNodes,
  Mixins,
  Innertube,
  IBrowseResponse,
} from "../../utils/Youtube";

import {parseArrayHorizontalData} from "@/extraction/ArrayExtraction";

const LOGGER = Logger.extend("FEED");

export function useFeedData(
  firstFeed: (youtube: Innertube) => Promise<Mixins.Feed<IBrowseResponse>>,
) {
  const youtube = useYoutubeContext();
  const [feed, setFeed] = useState<Mixins.Feed<IBrowseResponse>>();
  const [content, setContent] = useState<Helpers.YTNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>();

  const fetchFeed = useCallback(() => {
    if (!firstFeed || !youtube) {
      return;
    }
    setError(undefined);
    firstFeed(youtube)
      .then(result => {
        LOGGER.debug("Result fetched ", result.page_contents.type);
        setContent(extractYTNodes(result.page_contents));
        setFeed(result);
      })
      .catch(reason => {
        LOGGER.warn("Error fetching feed: ", reason);
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

  const contentFetched = useCallback(
    (node: Helpers.YTNode, reset?: boolean) => {
      if (reset) {
        setContent(extractYTNodes(node));
      } else {
        setContent([...content, ...extractYTNodes(node)]);
      }
    },
    [setContent, content],
  );

  const fetchMore = useCallback(async () => {
    LOGGER.debug("Fetch more!!!");
    if (!feed) {
      LOGGER.warn("No feed available");
      return;
    }
    if (!feed.has_continuation) {
      LOGGER.warn("No continuation available");
      return;
    }

    // LOGGER.debug("Feed: ", await feed.getContinuationData());

    const newFeed = await feed.getContinuation();

    LOGGER.debug("Feed content: ", newFeed.page_contents.type);

    const newValues = extractYTNodes(newFeed.page_contents);

    setContent([...content, ...newValues]);
    setFeed(newFeed);
  }, [feed, content]);

  useEffect(() => {
    if (feed && content.length < 10) {
      fetchMore().catch(LOGGER.warn);
    }
  }, [content, fetchMore, feed]);

  const parsedContent = useMemo(() => {
    return parseArrayHorizontalData(content);
  }, [content]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchFeed();
  }, [fetchFeed]);

  return {
    content,
    contentFetched,
    parsedContent,
    feed,
    setFeed,
    fetchMore,
    refresh,
    refreshing,
    loading: loading || !youtube,
    error,
  };
}

function extractYTNodes(node: Helpers.YTNode) {
  if (node.is(YTNodes.SectionList)) {
    return node.contents;
  } else if (node.is(YTNodes.RichGrid)) {
    return node.contents;
  } else {
    LOGGER.warn("Unknown type of Feed Node: ", node.type);
  }
  return [] as Helpers.YTNode[];
}
