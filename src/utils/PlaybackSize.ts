export interface PlaybackSize {
  width: number;
  height: number;
}

/**
 * Accepts the size reported by the native player (load or bandwidth event)
 * and drops placeholder values: bandwidth events can arrive without a size,
 * and AVPlayer reports 0x0 until the first frame is decoded.
 */
export function toPlaybackSize(data?: {
  width?: number;
  height?: number;
}): PlaybackSize | undefined {
  const width = data?.width;
  const height = data?.height;
  if (!width || !height || width <= 0 || height <= 0) {
    return undefined;
  }
  return {width: Math.round(width), height: Math.round(height)};
}

/** YouTube quality tiers as [label height, matching 16:9 width]. */
const QUALITY_TIERS: readonly (readonly [number, number])[] = [
  [4320, 7680],
  [2160, 3840],
  [1440, 2560],
  [1080, 1920],
  [720, 1280],
  [480, 854],
  [360, 640],
  [240, 426],
  [144, 256],
];

/**
 * Encoders crop a few pixels (e.g. 1916x1076), so a tier still matches
 * slightly below its nominal size.
 */
const TIER_TOLERANCE = 0.9;

/**
 * "1080p"-style label that matches YouTube's quality naming: a tier applies
 * when either the long side reaches the tier width or the short side reaches
 * the tier height. That keeps letterboxed films (3840x1608 → 2160p), 4:3
 * videos (1440x1080 → 1080p) and portrait shorts (1080x1920 → 1080p) on the
 * label YouTube shows instead of their raw pixel height.
 */
export function formatResolutionLabel(size: PlaybackSize) {
  const longSide = Math.max(size.width, size.height);
  const shortSide = Math.min(size.width, size.height);
  const tier = QUALITY_TIERS.find(
    ([height, width]) =>
      longSide >= width * TIER_TOLERANCE ||
      shortSide >= height * TIER_TOLERANCE,
  );
  return `${tier?.[0] ?? shortSide}p`;
}
