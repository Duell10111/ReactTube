/**
 * Watch history reporting, modelled on SmartTube's `TrackingService`.
 *
 * Kept free of React Native imports so the Node test runner can load it.
 *
 * YouTube records a view through two stats endpoints whose base URLs come with
 * the `/player` response (`playbackTracking`):
 *
 * - `videostats_playback` creates the history entry,
 * - `videostats_watchtime` reports a watched segment (`st` → `et`) and moves
 *   the resume position (`cmt`).
 *
 * The base URLs carry the account-bound parameters (`ei`, `of`, `vm`), so they
 * must come from a playable response of the signed-in session — an
 * `UNPLAYABLE` response has no `playbackTracking` at all.
 */

/** Below this position a first report counts the whole video from 0. */
export const START_THRESHOLD_SECONDS = 3 * 60;

/** After this pause between reports a new history entry is created. */
export const RECORD_RENEW_MS = 30 * 60_000;

/** Share of the duration that may remain for a video to count as watched. */
export const ALMOST_WATCHED_RATIO = 0.05;

/** Reporting interval during uninterrupted playback. */
export const PERIODIC_REPORT_MS = 3 * 60_000;

/** Delay after the last progress (pause, stall) until it is reported. */
export const IDLE_REPORT_DELAY_MS = 10_000;

/**
 * Lowest position that is reported — YouTube treats 0 as "fully watched".
 */
export const MIN_REPORT_POSITION_SECONDS = 3;

/** The last report, used to continue the same history entry. */
export interface WatchHistoryRecord {
  videoId: string;
  positionSec: number;
  reportedAtMs: number;
}

export interface WatchHistoryReport {
  videoId: string;
  positionSec: number;
  lengthSec: number;
  nowMs: number;
}

export interface WatchHistoryRequest {
  endpoint: "playback" | "watchtime";
  params: Record<string, string>;
}

export interface WatchHistoryPlan {
  requests: WatchHistoryRequest[];
  record: WatchHistoryRecord;
}

function formatSeconds(seconds: number): string {
  return seconds.toFixed(3);
}

/** Whether so little of the video remains that it counts as watched. */
export function isAlmostWatched(positionSec: number, lengthSec: number) {
  return lengthSec - positionSec < lengthSec * ALMOST_WATCHED_RATIO;
}

/** The position to report; see {@link MIN_REPORT_POSITION_SECONDS}. */
export function clampReportPosition(positionSec: number): number {
  return Math.max(positionSec, MIN_REPORT_POSITION_SECONDS);
}

/**
 * Plans the stats requests for one report.
 *
 * @param previous - The last report of this app session, if any.
 */
export function planWatchHistoryReport(
  previous: WatchHistoryRecord | undefined,
  report: WatchHistoryReport,
): WatchHistoryPlan {
  const {videoId, positionSec, lengthSec, nowMs} = report;
  const sameVideo = previous?.videoId === videoId;
  const record = {videoId, positionSec, reportedAtMs: nowMs};

  if (lengthSec > 0 && isAlmostWatched(positionSec, lengthSec)) {
    // A short record plus a final segment at the end marks it fully watched.
    const end = formatSeconds(lengthSec);
    return {
      requests: [
        {endpoint: "playback", params: {final: "1"}},
        {
          endpoint: "watchtime",
          params: {st: end, et: end, final: "1"},
        },
      ],
      record,
    };
  }

  const oldPositionSec = sameVideo
    ? previous.positionSec
    : positionSec < START_THRESHOLD_SECONDS
      ? 0
      : positionSec;
  const outdated = !previous || nowMs - previous.reportedAtMs > RECORD_RENEW_MS;
  const len = formatSeconds(lengthSec);
  const requests: WatchHistoryRequest[] = [];

  if (!sameVideo || outdated) {
    requests.push({
      endpoint: "playback",
      params: {len, cmt: formatSeconds(oldPositionSec)},
    });
  }

  requests.push({
    endpoint: "watchtime",
    params: {
      len,
      st: formatSeconds(oldPositionSec),
      et: formatSeconds(positionSec),
      cmt: formatSeconds(positionSec),
    },
  });

  return {requests, record};
}

/**
 * Turns a `playbackTracking` base URL into a request URL.
 *
 * The base URLs point at `s.youtube.com`; like SmartTube and youtubei.js the
 * requests go to `www.youtube.com`, which accepts the OAuth token.
 */
export function buildWatchHistoryUrl(
  baseUrl: string,
  cpn: string,
  params: Record<string, string>,
): string {
  const url = new URL(baseUrl.replace("https://s.", "https://www."));
  url.searchParams.set("ver", "2");
  url.searchParams.set("cpn", cpn);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}
