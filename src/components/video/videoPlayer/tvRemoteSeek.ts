import type {TVRemoteEvent} from "@/ui/tv/tvRemoteDispatcher";

/** Seconds a single left/right press jumps. */
export const TV_SEEK_STEP_SECONDS = 15;

/** How often a held direction key advances the scrub preview. */
export const TV_SCRUB_TICK_MS = 150;

/**
 * Taps that follow each other within this window build on the previous target
 * instead of the reported position, which lags behind until the player has
 * finished seeking. Without it, three quick presses only moved 15 seconds.
 */
export const TV_SEEK_CHAIN_WINDOW_MS = 1500;

/** Keeps a seek target off the very end so it does not count as finished. */
const END_MARGIN_SECONDS = 1;

const KEY_ACTION_DOWN = 0;
const KEY_ACTION_UP = 1;

export type SeekDirection = -1 | 1;

/**
 * `dpad` comes from the arrow keys, which only seek while the seek bar has
 * focus. `media` comes from dedicated rewind/fast-forward keys, which always
 * seek.
 */
export type SeekSource = "dpad" | "media";

export type RemoteSeekIntent =
  | {type: "step"; direction: SeekDirection; source: SeekSource}
  | {type: "scrubStart"; direction: SeekDirection; source: SeekSource}
  | {type: "scrubEnd"}
  | {type: "togglePlay"}
  | {type: "play"}
  | {type: "pause"};

export type RemotePlatform = "ios" | "android";

export interface RemoteSeekInterpreter {
  interpret: (event: TVRemoteEvent) => RemoteSeekIntent[];
  /** Forgets a held key, e.g. when the player loses the remote. */
  reset: () => void;
}

const directionKeys: Record<
  string,
  {direction: SeekDirection; source: SeekSource}
> = {
  left: {direction: -1, source: "dpad"},
  right: {direction: 1, source: "dpad"},
  rewind: {direction: -1, source: "media"},
  fastForward: {direction: 1, source: "media"},
};

const longDirectionKeys: Record<string, SeekDirection> = {
  longLeft: -1,
  longRight: 1,
};

const playbackKeys: Record<string, RemoteSeekIntent> = {
  playPause: {type: "togglePlay"},
  play: {type: "play"},
  pause: {type: "pause"},
};

/**
 * Turns raw remote events into player intents.
 *
 * The two TV platforms report the same press very differently:
 *
 * - tvOS sends a tap once, when it ends, and a held arrow as a separate
 *   `longLeft`/`longRight` event with a began (0) and an ended (1) phase.
 * - Android TV sends every key twice, once down (0) and once up (1), and a held
 *   key as repeated down events. It has no `long*` events at all.
 *
 * Reacting to every Android event made one play/pause press toggle twice (so
 * nothing happened) and one arrow press jump twice as far.
 */
export function createRemoteSeekInterpreter(
  platform: RemotePlatform,
): RemoteSeekInterpreter {
  /** Android only: the direction key that is currently down. */
  let heldKey: string | undefined;
  let scrubbing = false;

  const endScrub = (): RemoteSeekIntent[] => {
    if (!scrubbing) {
      return [];
    }
    scrubbing = false;
    return [{type: "scrubEnd"}];
  };

  const interpretAndroid = (event: TVRemoteEvent): RemoteSeekIntent[] => {
    const {eventType, eventKeyAction} = event;
    const directionKey = directionKeys[eventType];

    if (directionKey) {
      if (eventKeyAction === KEY_ACTION_DOWN) {
        if (heldKey !== eventType) {
          // A different key took over; finish whatever the old one started.
          const intents = endScrub();
          heldKey = eventType;
          return intents;
        }
        if (!scrubbing) {
          scrubbing = true;
          return [{type: "scrubStart", ...directionKey}];
        }
        return [];
      }

      if (eventKeyAction === KEY_ACTION_UP) {
        const wasHeld = heldKey === eventType;
        heldKey = undefined;
        if (scrubbing) {
          return endScrub();
        }
        // A press is a step only once it is released without repeating.
        return wasHeld ? [{type: "step", ...directionKey}] : [];
      }

      return [];
    }

    const playbackIntent = playbackKeys[eventType];
    if (!playbackIntent) {
      return [];
    }

    // Any other key ends a scrub whose release never arrived.
    const intents = endScrub();
    heldKey = undefined;
    // React to the down phase only, so a press counts once.
    if (eventKeyAction === KEY_ACTION_DOWN) {
      intents.push(playbackIntent);
    }
    return intents;
  };

  const interpretIOS = (event: TVRemoteEvent): RemoteSeekIntent[] => {
    const {eventType, eventKeyAction} = event;

    const longDirection = longDirectionKeys[eventType];
    if (longDirection !== undefined) {
      if (eventKeyAction === KEY_ACTION_DOWN) {
        const intents = endScrub();
        scrubbing = true;
        intents.push({
          type: "scrubStart",
          direction: longDirection,
          source: "dpad",
        });
        return intents;
      }
      // Only the ended phase finishes the scrub. A changed phase carries no
      // key action and used to be taken for the release.
      return eventKeyAction === KEY_ACTION_UP ? endScrub() : [];
    }

    const directionKey = directionKeys[eventType];
    if (directionKey) {
      return [...endScrub(), {type: "step", ...directionKey}];
    }

    const playbackIntent = playbackKeys[eventType];
    if (playbackIntent) {
      return [...endScrub(), playbackIntent];
    }

    return [];
  };

  return {
    interpret: event =>
      platform === "android" ? interpretAndroid(event) : interpretIOS(event),
    reset: () => {
      heldKey = undefined;
      scrubbing = false;
    },
  };
}

/** Clamps a seek target to the playable range of the video. */
export function clampSeekTime(seconds: number, duration: number): number {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return 0;
  }
  if (!(duration > 0)) {
    return seconds;
  }
  return Math.min(seconds, Math.max(0, duration - END_MARGIN_SECONDS));
}

/**
 * Seconds one scrub tick moves. The step grows with the video length, so a
 * short clip stays precise and a long stream is still crossed in seconds, and
 * it speeds up the longer the key is held.
 *
 * The old fixed step of 5 % of the bar per tick crossed a whole video in four
 * seconds no matter its length, which made precise positioning impossible.
 */
export function getScrubStepSeconds(duration: number, heldMs: number): number {
  const safeDuration = duration > 0 ? duration : 0;
  if (heldMs < 1500) {
    return Math.max(2, safeDuration * 0.004);
  }
  if (heldMs < 4000) {
    return Math.max(5, safeDuration * 0.01);
  }
  return Math.max(10, safeDuration * 0.025);
}

/** Position of a time on a seek bar of the given width. */
export function getSeekerPositionForTime(
  seconds: number,
  duration: number,
  seekerWidth: number,
): number {
  if (!(duration > 0) || !(seekerWidth > 0)) {
    return 0;
  }
  const ratio = Math.min(Math.max(seconds / duration, 0), 1);
  return ratio * seekerWidth;
}
