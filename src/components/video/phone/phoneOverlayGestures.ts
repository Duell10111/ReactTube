/**
 * Touch logic of the phone/tablet overlay player, kept free of React Native so
 * it can be tested on its own. The component only feeds taps in and runs the
 * results.
 */

/** Two taps on the same side within this window count as a double tap. */
export const DOUBLE_TAP_WINDOW_MS = 300;

/**
 * Once a double tap seeks, every further tap on a side within this window
 * keeps seeking, as on YouTube: tap-tap-tap jumps 20 seconds, not 10 plus a
 * toggled overlay.
 */
export const SEEK_CHAIN_WINDOW_MS = 800;

/** Seconds every seeking tap jumps. */
export const DOUBLE_TAP_SEEK_SECONDS = 10;

/** Playback rate while the video is held down. */
export const HOLD_PLAYBACK_RATE = 2;

/** How long the controls stay visible without interaction while playing. */
export const CONTROLS_HIDE_DELAY_MS = 3000;

/**
 * Share of the width on each side that seeks. The middle stays free for the
 * play button, where a double tap must not seek by accident.
 */
const SIDE_ZONE_RATIO = 0.4;

export type TapZone = "left" | "center" | "right";

export type SeekDirection = -1 | 1;

export function getTapZone(x: number, width: number): TapZone {
  if (!(width > 0)) {
    return "center";
  }
  const ratio = x / width;
  if (ratio < SIDE_ZONE_RATIO) {
    return "left";
  }
  if (ratio > 1 - SIDE_ZONE_RATIO) {
    return "right";
  }
  return "center";
}

function directionOfZone(zone: TapZone): SeekDirection | undefined {
  if (zone === "left") {
    return -1;
  }
  if (zone === "right") {
    return 1;
  }
  return undefined;
}

export interface SeekChain {
  direction: SeekDirection;
  /** Seconds the chain has jumped so far, always positive. */
  totalSeconds: number;
  lastTapAt: number;
}

export interface TapState {
  lastTapAt?: number;
  lastZone?: TapZone;
  chain?: SeekChain;
}

export type TapResult =
  /**
   * Possibly the first half of a double tap. The caller waits
   * `DOUBLE_TAP_WINDOW_MS` before acting on it, and drops it if a seek
   * arrives in the meantime.
   */
  | {kind: "single"}
  | {
      kind: "seek";
      direction: SeekDirection;
      /** Total jump of the chain, for the indicator and the seek target. */
      totalSeconds: number;
      /** True on the tap that opened the chain. */
      started: boolean;
    };

export interface Tap {
  x: number;
  width: number;
  at: number;
}

export const initialTapState: TapState = {};

export function interpretTap(
  state: TapState,
  {x, width, at}: Tap,
): {state: TapState; result: TapResult} {
  const zone = getTapZone(x, width);
  const direction = directionOfZone(zone);
  const chain = state.chain;

  if (chain && at - chain.lastTapAt <= SEEK_CHAIN_WINDOW_MS) {
    if (direction === chain.direction) {
      const next: SeekChain = {
        direction,
        totalSeconds: chain.totalSeconds + DOUBLE_TAP_SEEK_SECONDS,
        lastTapAt: at,
      };
      return {
        state: {lastTapAt: at, lastZone: zone, chain: next},
        result: {
          kind: "seek",
          direction,
          totalSeconds: next.totalSeconds,
          started: false,
        },
      };
    }
    if (direction !== undefined) {
      // Switching sides mid-chain turns around right away instead of
      // needing a fresh double tap.
      return startChain(direction, zone, at);
    }
  }

  if (
    direction !== undefined &&
    state.lastTapAt !== undefined &&
    state.lastZone === zone &&
    at - state.lastTapAt <= DOUBLE_TAP_WINDOW_MS
  ) {
    return startChain(direction, zone, at);
  }

  return {
    state: {lastTapAt: at, lastZone: zone},
    result: {kind: "single"},
  };
}

function startChain(
  direction: SeekDirection,
  zone: TapZone,
  at: number,
): {state: TapState; result: TapResult} {
  return {
    state: {
      lastTapAt: at,
      lastZone: zone,
      chain: {direction, totalSeconds: DOUBLE_TAP_SEEK_SECONDS, lastTapAt: at},
    },
    result: {
      kind: "seek",
      direction,
      totalSeconds: DOUBLE_TAP_SEEK_SECONDS,
      started: true,
    },
  };
}

/** Where a chain lands, measured from the position at its first tap. */
export function getChainSeekTarget(
  originSeconds: number,
  direction: SeekDirection,
  totalSeconds: number,
  durationSeconds: number,
): number {
  const target = originSeconds + direction * totalSeconds;
  if (!Number.isFinite(target) || target < 0) {
    return 0;
  }
  if (!(durationSeconds > 0)) {
    return target;
  }
  // Keep off the very end so the jump does not count as the video finishing.
  return Math.min(target, Math.max(0, durationSeconds - 1));
}

/** Seek bar position as a fraction between 0 and 1. */
export function getProgressFraction(
  currentSeconds: number,
  durationSeconds: number,
): number {
  if (!(durationSeconds > 0) || !Number.isFinite(currentSeconds)) {
    return 0;
  }
  return Math.min(1, Math.max(0, currentSeconds / durationSeconds));
}

/** Seconds that belong to a touch at `x` on a bar of `width`. */
export function getTimeForBarPosition(
  x: number,
  width: number,
  durationSeconds: number,
): number {
  if (!(width > 0) || !(durationSeconds > 0)) {
    return 0;
  }
  return getProgressFraction(x / width, 1) * durationSeconds;
}

/**
 * Time label as YouTube writes it: `4:05`, and `1:02:03` once the video is an
 * hour long. Minutes are not zero-padded in front.
 */
export function formatPlaybackTime(
  seconds: number,
  durationSeconds = seconds,
): string {
  const total = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const pad = (value: number) => value.toString().padStart(2, "0");

  if (hours > 0 || durationSeconds >= 3600) {
    return `${hours}:${pad(minutes)}:${pad(secs)}`;
  }
  return `${minutes}:${pad(secs)}`;
}
