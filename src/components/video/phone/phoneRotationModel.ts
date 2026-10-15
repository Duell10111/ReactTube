/**
 * How the phone is physically held, read from gravity, and what that means
 * for full screen. Kept free of React Native so it can be tested on its own.
 *
 * The orientation APIs cannot be used for this: while the app is locked to
 * portrait, both iOS and Android report the orientation of the interface,
 * which never changes. Gravity reports the device itself.
 */

export type DeviceOrientation = "portrait" | "landscape";

/**
 * Below 30° from upright counts as portrait, above 60° as landscape. The band
 * in between keeps the previous reading, so a phone held at an angle does not
 * flip back and forth.
 */
const PORTRAIT_MAX_DEGREES = 30;
const LANDSCAPE_MIN_DEGREES = 60;

/**
 * Lying nearly flat, gravity points through the screen and says nothing about
 * how the phone is turned. The share of gravity left in the screen plane has
 * to be at least this large.
 */
const MIN_PLANAR_SHARE = 0.5;

/** How long a new reading has to hold before it counts. */
export const ROTATION_SETTLE_MS = 400;

/**
 * Classifies a gravity sample. Only magnitudes are used: the sign conventions
 * differ between iOS and Android, and left versus right or upside down do not
 * matter here.
 */
export function classifyDeviceOrientation(
  x: number,
  y: number,
  z: number,
): DeviceOrientation | undefined {
  const planar = Math.hypot(x, y);
  const total = Math.hypot(x, y, z);
  if (!(total > 0) || planar / total < MIN_PLANAR_SHARE) {
    return undefined;
  }
  const degreesFromUpright =
    (Math.atan2(Math.abs(x), Math.abs(y)) * 180) / Math.PI;
  if (degreesFromUpright <= PORTRAIT_MAX_DEGREES) {
    return "portrait";
  }
  if (degreesFromUpright >= LANDSCAPE_MIN_DEGREES) {
    return "landscape";
  }
  return undefined;
}

export interface RotationState {
  /** The settled orientation; missing until the first one has settled. */
  settled?: DeviceOrientation;
  candidate?: DeviceOrientation;
  candidateSince?: number;
}

export const initialRotationState: RotationState = {};

/**
 * Feeds one classified sample in. A change is reported once, after the new
 * orientation held for `ROTATION_SETTLE_MS`, so a phone swung through
 * landscape on its way to a table does not open full screen.
 */
export function updateRotation(
  state: RotationState,
  sample: DeviceOrientation | undefined,
  now: number,
): {
  state: RotationState;
  changed?: {from?: DeviceOrientation; to: DeviceOrientation};
} {
  if (sample === undefined) {
    // Flat or in between: a pending candidate stays pending.
    return {state};
  }
  if (sample === state.settled) {
    // Back where it was: the candidate was only a swing.
    return {state: {settled: state.settled}};
  }
  if (sample !== state.candidate || state.candidateSince === undefined) {
    return {state: {...state, candidate: sample, candidateSince: now}};
  }
  if (now - state.candidateSince < ROTATION_SETTLE_MS) {
    return {state};
  }
  return {
    state: {settled: sample},
    changed: {from: state.settled, to: sample},
  };
}

/**
 * YouTube's rule: turning the phone to landscape opens full screen, turning
 * it back to portrait closes it. Only an actual turn counts, never the
 * orientation the phone already had: after the full screen button was used,
 * the player follows the button until the phone is turned again. The first
 * reading after opening the video is no turn either.
 */
export function getRotationFullscreenAction(
  change: {from?: DeviceOrientation; to: DeviceOrientation},
  fullscreen: boolean,
): "enter" | "exit" | undefined {
  if (change.from === undefined) {
    return undefined;
  }
  if (change.to === "landscape" && !fullscreen) {
    return "enter";
  }
  if (change.to === "portrait" && fullscreen) {
    return "exit";
  }
  return undefined;
}
