import {useCallback, useEffect, useRef} from "react";

import {useYoutubeTVContext} from "@/context/YoutubeContext";
import Logger from "@/utils/Logger";
import {
  IDLE_REPORT_DELAY_MS,
  PERIODIC_REPORT_MS,
  WatchHistoryRecord,
  clampReportPosition,
  planWatchHistoryReport,
} from "@/utils/watchHistory";
import {
  WatchHistoryContext,
  fetchWatchHistoryContext,
  sendWatchHistoryRequests,
} from "@/utils/watchHistoryClient";

const LOGGER = Logger.extend("HISTORY");

/**
 * The last report across all players, like SmartTube's singleton
 * `TrackingService`: reopening the same video continues its history entry.
 */
let lastRecord: WatchHistoryRecord | undefined;

/** Reports run one after another so their segments stay in order. */
let reportQueue: Promise<void> = Promise.resolve();

/** A movement smaller than this is no playback progress. */
const PROGRESS_EPSILON_SECONDS = 0.5;

interface Options {
  videoId?: string;
  /** Fallback when the tracking response carries no duration. */
  durationSeconds?: number;
  enabled: boolean;
}

/**
 * Reports playback to the signed-in account's YouTube history on SmartTube's
 * schedule: when playback starts, every few minutes while it runs, shortly
 * after it stops (pause or stall), at the end, and when the video is left.
 *
 * Driven only by progress events, so it works with every player — not all of
 * them report pauses.
 */
export default function useWatchHistory({
  videoId,
  durationSeconds,
  enabled,
}: Options) {
  const signedInYoutube = useYoutubeTVContext();

  const optionsRef = useRef({videoId, durationSeconds, enabled});
  optionsRef.current = {videoId, durationSeconds, enabled};
  const youtubeRef = useRef(signedInYoutube);
  youtubeRef.current = signedInYoutube;

  const contextRef =
    useRef<Promise<WatchHistoryContext | undefined>>(undefined);
  const positionRef = useRef<number>(undefined);
  const lastReportAtRef = useRef<number>(undefined);
  const reportedPositionRef = useRef<number>(undefined);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const report = useCallback(
    (targetVideoId: string, positionSec: number, fallbackLength?: number) => {
      const youtube = youtubeRef.current;
      if (!youtube?.session.logged_in) {
        return;
      }

      lastReportAtRef.current = Date.now();
      reportedPositionRef.current = positionSec;

      if (!contextRef.current) {
        contextRef.current = fetchWatchHistoryContext(
          youtube,
          targetVideoId,
        ).catch(error => {
          LOGGER.warn("Fetching the history tracking failed: ", error);
          // The next report tries again.
          contextRef.current = undefined;
          return undefined;
        });
      }
      const contextPromise = contextRef.current;

      reportQueue = reportQueue
        .then(async () => {
          const context = await contextPromise;
          const lengthSec = context?.lengthSec ?? fallbackLength;
          if (!context || !lengthSec) {
            return;
          }
          const plan = planWatchHistoryReport(lastRecord, {
            videoId: targetVideoId,
            positionSec: clampReportPosition(positionSec),
            lengthSec,
            nowMs: Date.now(),
          });
          LOGGER.debug(
            `Reporting ${targetVideoId} at ${Math.floor(positionSec)} s: ` +
              plan.requests.map(request => request.endpoint).join(" + "),
          );
          lastRecord = plan.record;
          await sendWatchHistoryRequests(youtube, context, plan.requests);
        })
        .catch(error => LOGGER.warn("History update failed: ", error));
    },
    [],
  );

  const clearIdleTimer = () => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = undefined;
    }
  };

  /** Reports the last position if it moved since the last report. */
  const flush = useCallback(() => {
    clearIdleTimer();
    const {
      videoId: currentId,
      durationSeconds: duration,
      enabled: active,
    } = optionsRef.current;
    const position = positionRef.current;
    if (
      active &&
      currentId &&
      position !== undefined &&
      position !== reportedPositionRef.current
    ) {
      report(currentId, position, duration);
    }
  }, [report]);

  const onProgress = useCallback(
    (seconds: number) => {
      const {
        videoId: currentId,
        durationSeconds: duration,
        enabled: active,
      } = optionsRef.current;
      if (!active || !currentId) {
        return;
      }
      const previous = positionRef.current;
      positionRef.current = seconds;
      if (
        previous !== undefined &&
        Math.abs(seconds - previous) < PROGRESS_EPSILON_SECONDS
      ) {
        // No movement (paused, buffering): leave the idle timer running.
        return;
      }

      const lastReportAt = lastReportAtRef.current;
      if (
        lastReportAt === undefined ||
        Date.now() - lastReportAt >= PERIODIC_REPORT_MS
      ) {
        report(currentId, seconds, duration);
      }

      clearIdleTimer();
      idleTimerRef.current = setTimeout(flush, IDLE_REPORT_DELAY_MS);
    },
    [flush, report],
  );

  const onEnded = useCallback(() => {
    clearIdleTimer();
    const {
      videoId: currentId,
      durationSeconds: duration,
      enabled: active,
    } = optionsRef.current;
    if (!active || !currentId) {
      return;
    }
    const position = duration ?? positionRef.current;
    if (position !== undefined) {
      positionRef.current = position;
      report(currentId, position, duration);
    }
  }, [report]);

  // Leaving the video (other video, closed screen) reports where it stopped.
  useEffect(() => {
    if (!videoId) {
      return;
    }
    return () => {
      if (optionsRef.current.enabled) {
        // The options already point at the next video; report the old one.
        const position = positionRef.current;
        if (
          position !== undefined &&
          position !== reportedPositionRef.current
        ) {
          report(videoId, position, durationSeconds);
        }
      }
      clearIdleTimer();
      contextRef.current = undefined;
      positionRef.current = undefined;
      lastReportAtRef.current = undefined;
      reportedPositionRef.current = undefined;
    };
    // `durationSeconds` belongs to the video and arrives with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, report]);

  return {onProgress, onEnded};
}
