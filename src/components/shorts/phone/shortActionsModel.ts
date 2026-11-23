/**
 * Like count shown while the rating may have changed since the video info was
 * fetched. The fetched count already includes a like given before, so only
 * the difference to that rating is applied.
 */
export function getShortLikeCount(
  fetchedCount: number | undefined,
  likedWhenFetched: boolean,
  liked: boolean,
): number | undefined {
  if (fetchedCount === undefined) {
    return undefined;
  }

  return Math.max(
    0,
    fetchedCount + (liked ? 1 : 0) - (likedWhenFetched ? 1 : 0),
  );
}

/** The link the share action hands to the system share sheet. */
export function getShortShareUrl(videoId: string): string {
  return `https://www.youtube.com/shorts/${encodeURIComponent(videoId)}`;
}

/** Most of a short's width that filling the screen may cut off. */
const maxCoverCrop = 0.2;

/**
 * Whether a short fills the screen instead of fitting into it. A portrait
 * short on a taller phone loses a little at its sides, which is what the
 * YouTube app accepts to avoid bands above and below; a landscape short would
 * lose most of its picture, so it keeps fitting.
 */
export function shouldShortFillScreen(
  video: {width?: number; height?: number} | undefined,
  viewport: {width: number; height: number},
): boolean {
  const {width, height} = video ?? {};
  if (!width || !height || viewport.width <= 0 || viewport.height <= 0) {
    return false;
  }

  const videoAspect = width / height;
  const viewportAspect = viewport.width / viewport.height;
  if (videoAspect >= 1) {
    return false;
  }

  const crop =
    videoAspect > viewportAspect ? 1 - viewportAspect / videoAspect : 0;
  return crop <= maxCoverCrop;
}
