/**
 * Where playback starts, together with where that position came from.
 *
 * The origin is fixed when the position is set: deciding it later from the
 * live position would turn a dropped near-end marker into a seek once the
 * first progress event arrives.
 */
export interface PlaybackStart {
  seconds?: number;
  /** Taken from the running player (source switch, refresh), not a saved marker. */
  fromPlayback: boolean;
}

/** A start at the running player's current position. */
export function playbackStartAt(seconds: number | undefined): PlaybackStart {
  return {seconds, fromPlayback: seconds !== undefined};
}

/** Keeps a source reload at the current position without carrying it to another video. */
export function playbackStartAfterReload({
  sameVideo,
  currentSeconds,
  previousStartSeconds,
  requestedStartSeconds,
}: {
  sameVideo: boolean;
  currentSeconds?: number;
  previousStartSeconds?: number;
  requestedStartSeconds?: number;
}): number | undefined {
  if (!sameVideo) {
    return requestedStartSeconds;
  }

  return currentSeconds ?? previousStartSeconds ?? requestedStartSeconds;
}

/** Near-end saved markers restart; a live source switch keeps its exact position. */
export function clampPlaybackResumePosition(
  seconds: number | undefined,
  durationSeconds: number | undefined,
  fromCurrentPlayback = false,
): number | undefined {
  if (!seconds || seconds <= 0) return undefined;
  if (!durationSeconds) return seconds;
  const limit = fromCurrentPlayback ? durationSeconds : durationSeconds - 5;
  return seconds < limit ? seconds : undefined;
}
