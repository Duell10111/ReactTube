import {useCallback, useEffect, useRef, useState} from "react";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {
  ShortsQueueLoader,
  type ShortsQueueState,
} from "@/hooks/video/shortsQueueLoader";
import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("SHORTS");

/** Shared sequence for touch paging and TV remote navigation. */
export function useShortsQueue(initialVideoId: string) {
  const youtube = useYoutubeContext();
  const [state, setState] = useState<ShortsQueueState>({
    videoIds: [initialVideoId],
    hasMore: true,
  });
  const queueRef = useRef<ShortsQueueLoader>(undefined);

  useEffect(() => {
    setState({videoIds: [initialVideoId], hasMore: true});
    if (!youtube) return;

    const queue = new ShortsQueueLoader(
      initialVideoId,
      () => youtube.getShortsVideoInfo(initialVideoId),
      setState,
      error => LOGGER.debug("Shorts sequence could not be loaded", error),
    );
    queueRef.current = queue;
    queue.fetchMore();
    return () => {
      queue.dispose();
      queueRef.current = undefined;
    };
  }, [initialVideoId, youtube]);

  const fetchMore = useCallback(() => {
    queueRef.current?.fetchMore();
  }, []);

  return {...state, fetchMore};
}
