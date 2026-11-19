/**
 * Reports watched videos to the signed-in account's YouTube history.
 *
 * Kept free of React Native imports so the Node test runner can load it.
 *
 * YouTube attributes the stats pings (`videostats_playback_url`,
 * `videostats_watchtime_url`) to the account whose `/player` response handed
 * them out. Two sources the app already has cannot serve that:
 *
 * - The streams come from the anonymous instance, so their tracking URLs
 *   belong to no account.
 * - `tv.getInfo` answers `UNPLAYABLE (The page needs to be reloaded.)` and
 *   carries no `playbackTracking` at all (measured 2026-11-19), so
 *   `addToWatchHistory` only throws "Playback tracking not available".
 *
 * The tracking therefore comes from a separate signed-in `/player` request.
 */

/** How far playback moves before the resume position is reported again. */
export const WATCH_TIME_INTERVAL_SECONDS = 30;

/** The part of a video info the reporter needs. */
export interface WatchHistoryTarget {
  addToWatchHistory(): Promise<unknown>;
  updateWatchTime(seconds: number): Promise<unknown>;
}

/** Whether a player response carries the stats URLs the history needs. */
export function hasPlaybackTracking(info: {
  page?: readonly unknown[];
}): boolean {
  const player = info.page?.[0] as
    | {
        playback_tracking?: {
          videostats_playback_url?: string;
          videostats_watchtime_url?: string;
        };
      }
    | undefined;
  return (
    !!player?.playback_tracking?.videostats_playback_url &&
    !!player.playback_tracking.videostats_watchtime_url
  );
}

/**
 * Creates the reporter for one video. The tracking source is loaded on the
 * first report and reused afterwards; a failed load is retried on the next
 * report, while `undefined` (signed out) is final for this video.
 *
 * Without `seconds` the reporter marks the video as watched, with `seconds` it
 * updates the resume position. It resolves to whether a ping was sent.
 */
export function createWatchHistoryReporter(
  load: () => Promise<WatchHistoryTarget | undefined>,
): (seconds?: number) => Promise<boolean> {
  let pending: Promise<WatchHistoryTarget | undefined> | undefined;
  return async seconds => {
    pending ??= load().catch(reason => {
      pending = undefined;
      throw reason;
    });
    const target = await pending;
    if (!target) return false;
    if (seconds) {
      await target.updateWatchTime(seconds);
    } else {
      await target.addToWatchHistory();
    }
    return true;
  };
}

/**
 * Turns player progress into history reports for one video: the first
 * progress marks the video as watched, later ones update the resume position
 * once playback has moved more than `intervalSeconds`, and the end reports the
 * full duration.
 */
export function createWatchProgressTracker(
  report: (seconds?: number) => Promise<unknown>,
  intervalSeconds = WATCH_TIME_INTERVAL_SECONDS,
) {
  let lastReported: number | undefined;
  return {
    progress(currentTime: number): Promise<unknown> | undefined {
      if (!Number.isFinite(currentTime)) return undefined;
      if (
        lastReported !== undefined &&
        Math.abs(lastReported - currentTime) <= intervalSeconds
      )
        return undefined;
      const seconds =
        lastReported === undefined ? undefined : Math.floor(currentTime);
      lastReported = currentTime;
      return report(seconds);
    },
    ended(durationSeconds?: number): Promise<unknown> | undefined {
      return durationSeconds ? report(durationSeconds) : undefined;
    },
  };
}
