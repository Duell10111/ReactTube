import {useCallback, useEffect, useRef, useState} from "react";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {parseComments} from "@/extraction/CommentExtraction";
import {YTComment} from "@/extraction/Types";
import Logger from "@/utils/Logger";
import {YT} from "@/utils/Youtube";

const LOGGER = Logger.extend("COMMENTS");

export interface VideoComments {
  comments: YTComment[];
  loading: boolean;
  loadingMore: boolean;
  error?: unknown;
  /** Total as YouTube reports it, which is not the number of loaded entries. */
  count?: string;
  retry: () => void;
  fetchMore: () => void;
}

/**
 * Comments of one video, loaded lazily. Nothing is requested until a surface
 * asks for it, because the description and queue panels open without comments
 * and the request costs a round trip.
 */
export default function useVideoComments(
  videoId: string,
  enabled: boolean,
): VideoComments {
  const youtube = useYoutubeContext();
  const commentsRef = useRef<YT.Comments>(undefined);
  const [comments, setComments] = useState<YTComment[]>([]);
  const [count, setCount] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<unknown>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled || !youtube) {
      return;
    }

    let active = true;
    setLoading(true);
    setError(undefined);

    youtube
      .getComments(videoId)
      .then(result => {
        if (!active) {
          return;
        }

        commentsRef.current = result;
        setComments(parseComments(result));
        setCount(result.header?.comments_count?.text);
        setLoading(false);
      })
      .catch(reason => {
        LOGGER.warn("Could not load comments: ", reason);

        if (active) {
          setError(reason);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [attempt, enabled, videoId, youtube]);

  const fetchMore = useCallback(() => {
    const current = commentsRef.current;

    if (!current?.has_continuation || loadingMore) {
      return;
    }

    setLoadingMore(true);
    current
      .getContinuation()
      .then(next => {
        commentsRef.current = next;
        setComments(previous => [...previous, ...parseComments(next)]);
        setLoadingMore(false);
      })
      .catch(reason => {
        LOGGER.warn("Could not load more comments: ", reason);
        setLoadingMore(false);
      });
  }, [loadingMore]);

  const retry = useCallback(() => setAttempt(previous => previous + 1), []);

  return {comments, loading, loadingMore, error, count, retry, fetchMore};
}
