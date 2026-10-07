import type {TVRemoteEvent} from "@/ui/tv/tvRemoteDispatcher";

/** Android TV reports every key twice; only the release counts as a press. */
const ANDROID_KEY_ACTION_UP = 1;

/** How many shorts before the end of the queue the next page is requested. */
export const SHORTS_PREFETCH_DISTANCE = 3;

export type ShortsRemoteIntent = "next" | "previous" | "togglePlay";

export type ShortRole = "previous" | "active" | "next";

export interface ShortsWindowEntry {
  videoId: string;
  role: ShortRole;
}

interface EndpointLike {
  payload?: Record<string, unknown>;
}

/**
 * Video id of a reel endpoint from the shorts sequence. The TV metadata client
 * cannot resolve a `reelWatchEndpoint`, so the queue only carries plain ids.
 */
export function shortIdFromEndpoint(
  endpoint: EndpointLike | string | undefined,
): string | undefined {
  if (typeof endpoint === "string") {
    return endpoint || undefined;
  }

  const videoId = endpoint?.payload?.videoId;

  return typeof videoId === "string" && videoId.length > 0
    ? videoId
    : undefined;
}

/**
 * Appends new ids in order and drops the ones already queued. The sequence
 * regularly repeats the short it was started from, and a duplicate would make
 * "next" replay what was just watched.
 */
export function appendShortIds(
  existing: readonly string[],
  incoming: readonly (string | undefined)[],
): string[] {
  const seen = new Set(existing);
  const result = [...existing];

  for (const id of incoming) {
    if (id && !seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }

  return result;
}

/** Moves within the queue, staying on the first or last short at the ends. */
export function stepShortIndex(
  current: number,
  intent: "next" | "previous",
  length: number,
): number {
  if (length <= 0) {
    return 0;
  }

  const next = current + (intent === "next" ? 1 : -1);

  return Math.min(Math.max(next, 0), length - 1);
}

/**
 * The shorts kept mounted around the active one. The next one preloads so
 * "down" is instant; the previous one stays so going back does not reload what
 * was just watched. Everything further away is unmounted to bound the number
 * of players and stream resolutions in flight.
 */
export function getShortsWindow(
  videoIds: readonly string[],
  index: number,
): ShortsWindowEntry[] {
  const entries: ShortsWindowEntry[] = [];
  const roles: [number, ShortRole][] = [
    [index - 1, "previous"],
    [index, "active"],
    [index + 1, "next"],
  ];

  for (const [position, role] of roles) {
    const videoId = videoIds[position];
    if (videoId) {
      entries.push({videoId, role});
    }
  }

  return entries;
}

export function shouldPrefetchShorts(
  index: number,
  length: number,
  distance = SHORTS_PREFETCH_DISTANCE,
): boolean {
  return length - 1 - index < distance;
}

/**
 * Turns a remote event into a shorts intent. Up and down always switch the
 * short, independent of the focused control, which is why the screen keeps
 * every focusable element in one row: the focus engine then never moves
 * vertically, so a press cannot both move focus and change the short.
 */
export function interpretShortsRemoteEvent(
  event: TVRemoteEvent,
  platform: "ios" | "android",
): ShortsRemoteIntent | undefined {
  if (
    platform === "android" &&
    event.eventKeyAction !== undefined &&
    event.eventKeyAction !== ANDROID_KEY_ACTION_UP
  ) {
    return undefined;
  }

  switch (event.eventType) {
    case "down":
      return "next";
    case "up":
      return "previous";
    case "playPause":
      return "togglePlay";
    default:
      return undefined;
  }
}
