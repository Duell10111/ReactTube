import {useCallback, useEffect, useRef, useState} from "react";

import {mergeCommentPages} from "./commentPages";
import {requestCommentsWithFallback} from "./commentRequest";

import {useYoutubeContext, useYoutubeTVContext} from "@/context/YoutubeContext";
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
  const classicYoutube = useYoutubeContext();
  const tvYoutube = useYoutubeTVContext();
  const primaryYoutube = tvYoutube?.session.logged_in
    ? tvYoutube
    : (classicYoutube ?? tvYoutube);
  const fallbackYoutube =
    primaryYoutube === classicYoutube ? tvYoutube : classicYoutube;
  const commentsRef = useRef<YT.Comments>(undefined);
  /**
   * Guards the continuation request. `loadingMore` alone cannot: a scroll
   * fires several times before React has re-rendered with the new state, so
   * two calls pass the check and the same page is appended twice.
   */
  const loadingMoreRef = useRef(false);
  const [comments, setComments] = useState<YTComment[]>([]);
  const [count, setCount] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<unknown>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled || !primaryYoutube) {
      return;
    }

    let active = true;
    loadingMoreRef.current = false;
    setLoading(true);
    setError(undefined);

    requestCommentsWithFallback(videoId, [primaryYoutube, fallbackYoutube], {
      // A page counts as an answer only if comments can be read out of it, so
      // a session that returns comment nodes without their entity batch does
      // not stop the fallback from trying the other session.
      isUsable: page => parseComments(page).length > 0,
    })
      .then(result => {
        if (!active) {
          return;
        }

        const parsed = parseComments(result);

        commentsRef.current = result;
        setComments(mergeCommentPages([], parsed));
        setCount(result.header?.comments_count?.text);
        setLoading(false);

        if (parsed.length === 0 && result.contents.length > 0) {
          // The page had entries, none of them readable. That is a failure,
          // not a video without comments, and saying so beats a blank panel.
          LOGGER.warn(
            `Comment page carried ${result.contents.length} unreadable entries`,
          );
          setError(new Error("Comments could not be read"));
          return;
        }

        setError(undefined);
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
  }, [attempt, enabled, fallbackYoutube, primaryYoutube, videoId]);

  const fetchMore = useCallback(() => {
    const current = commentsRef.current;

    if (!current?.has_continuation || loadingMoreRef.current) {
      return;
    }

    loadingMoreRef.current = true;
    setLoadingMore(true);
    current
      .getContinuation()
      .then(next => {
        commentsRef.current = next;
        setComments(previous =>
          mergeCommentPages(previous, parseComments(next)),
        );
      })
      .catch(reason => {
        LOGGER.warn("Could not load more comments: ", reason);
      })
      .finally(() => {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      });
  }, []);

  const retry = useCallback(() => setAttempt(previous => previous + 1), []);
  const waitingForFirstPage =
    enabled && !error && comments.length === 0 && !commentsRef.current;

  return {
    comments,
    loading: loading || waitingForFirstPage,
    loadingMore,
    error,
    count,
    retry,
    fetchMore,
  };
}
