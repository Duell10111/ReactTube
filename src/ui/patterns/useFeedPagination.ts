import {useCallback, useRef, useState} from "react";

export interface FeedPagination {
  loadingMore: boolean;
  handleEndReached: () => void;
}

/**
 * Pagination guard for a feed list. `onEndReached` keeps firing while the end
 * of the list stays visible, so without the guard the same page is requested
 * several times in parallel and a footer loader would flicker.
 */
export function useFeedPagination(
  onEndReached: (() => void | Promise<unknown>) | undefined,
  hasItems: boolean,
): FeedPagination {
  const [loadingMore, setLoadingMore] = useState(false);
  const pending = useRef(false);

  const handleEndReached = useCallback(() => {
    if (!onEndReached || pending.current || !hasItems) {
      return;
    }

    pending.current = true;
    setLoadingMore(true);

    Promise.resolve(onEndReached())
      .catch(() => undefined)
      .finally(() => {
        pending.current = false;
        setLoadingMore(false);
      });
  }, [hasItems, onEndReached]);

  return {loadingMore, handleEndReached};
}
