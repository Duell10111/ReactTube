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
