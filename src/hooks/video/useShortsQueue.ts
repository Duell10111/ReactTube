import {useCallback, useEffect, useRef, useState} from "react";

import {
  appendShortIds,
  shortIdFromEndpoint,
} from "@/components/shorts/tv/shortsQueueModel";
import {useYoutubeContext} from "@/context/YoutubeContext";
import Logger from "@/utils/Logger";
import {YTShorts} from "@/utils/Youtube";

const LOGGER = Logger.extend("SHORTS");

/**
 * The ordered list of shorts to swipe through, starting with `initialVideoId`
 * and followed by YouTube's shorts sequence for it. Further pages are loaded
 * on demand through `fetchMore`.
 */
export function useShortsQueue(initialVideoId: string) {
  const youtube = useYoutubeContext();
  const [videoIds, setVideoIds] = useState<string[]>([initialVideoId]);
  const [hasMore, setHasMore] = useState(true);
  const infoRef = useRef<YTShorts.ShortFormVideoInfo>(undefined);
  // A ref, not state: two remote presses in one frame must not both request
  // the same continuation.
  const loadingRef = useRef(false);

  const appendFeed = useCallback((info: YTShorts.ShortFormVideoInfo) => {
    const ids = (info.watch_next_feed ?? []).map(shortIdFromEndpoint);
    setVideoIds(previous => appendShortIds(previous, ids));
    return ids.length;
  }, []);

  useEffect(() => {
    setVideoIds([initialVideoId]);
    setHasMore(true);
    infoRef.current = undefined;

    if (!youtube) {
      return;
    }

    let cancelled = false;
    loadingRef.current = true;

    youtube
      .getShortsVideoInfo(initialVideoId)
      .then(info => {
        if (cancelled) {
          return;
        }
        infoRef.current = info;
        appendFeed(info);
      })
      .catch(error => {
        LOGGER.warn("Shorts sequence could not be loaded", error);
        if (!cancelled) {
          setHasMore(false);
        }
      })
      .finally(() => {
        loadingRef.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [appendFeed, initialVideoId, youtube]);

  const fetchMore = useCallback(() => {
    const info = infoRef.current;

    if (!info || loadingRef.current || !hasMore) {
      return;
    }

    loadingRef.current = true;
    info
      .getWatchNextContinuation()
      .then(next => {
        infoRef.current = next;
        if (appendFeed(next) === 0) {
          setHasMore(false);
        }
      })
      .catch(error => {
        // The last page has no continuation; the library reports that as an
        // error, which simply ends the queue.
        LOGGER.debug("No further shorts", error);
        setHasMore(false);
      })
      .finally(() => {
        loadingRef.current = false;
      });
  }, [appendFeed, hasMore]);

  return {videoIds, hasMore, fetchMore};
}
