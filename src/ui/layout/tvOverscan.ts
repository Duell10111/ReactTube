import {spacing} from "../theme/spacing.ts";

/**
 * A TV panel may crop the outer edge of the signal, so the first and last few
 * percent of each axis are not reliably visible. Both platforms publish a
 * title-safe margin for that, and they do not agree on a single number because
 * they do not use the same logical resolution:
 *
 * - tvOS renders 1920 x 1080 points and asks for 60 x 30 points.
 * - Android TV renders 960 x 540 dp and asks for 48 x 27 dp.
 *
 * A ratio with a floor satisfies both: the ratio reproduces the tvOS margin on
 * the larger coordinate space, and the floor reproduces the Android TV margin
 * on the smaller one. The cap keeps an unusually large logical surface from
 * spending a tenth of the screen on a margin nothing crops.
 */
export const tvOverscanMetrics = {
  horizontalRatio: 0.031,
  verticalRatio: 0.028,
  minHorizontal: 48,
  minVertical: 27,
  maxHorizontal: 96,
  maxVertical: 54,
  /**
   * Content never sits closer to the rail than this, even where the rail is
   * already wider than the overscan margin. Without it the first column would
   * touch the rail as soon as the rail covers the crop.
   */
  minGutter: spacing.xxl,
} as const;

export interface TVOverscanInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export const zeroOverscanInsets: TVOverscanInsets = {
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
};

export interface TVSurfaceSize {
  width: number;
  height: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function axisInset(
  size: number,
  ratio: number,
  min: number,
  max: number,
): number {
  if (!Number.isFinite(size) || size <= 0) {
    return 0;
  }

  return Math.round(clamp(size * ratio, min, max));
}

/**
 * The title-safe margin of a TV surface. Every TV inset in the app derives from
 * this, so a screen cannot decide on its own what "safe" means.
 */
export function getTVOverscanInsets({
  width,
  height,
}: TVSurfaceSize): TVOverscanInsets {
  const horizontal = axisInset(
    width,
    tvOverscanMetrics.horizontalRatio,
    tvOverscanMetrics.minHorizontal,
    tvOverscanMetrics.maxHorizontal,
  );
  const vertical = axisInset(
    height,
    tvOverscanMetrics.verticalRatio,
    tvOverscanMetrics.minVertical,
    tvOverscanMetrics.maxVertical,
  );

  return {top: vertical, bottom: vertical, left: horizontal, right: horizontal};
}

/**
 * The insets a TV screen inside the content plane has to keep. The plane starts
 * behind the rail, so the rail already covers the leading crop: what remains on
 * that side is the gutter that keeps content off the rail, not the margin
 * again. Applying the full leading margin a second time would push every feed
 * an entire rail width to the right.
 */
export function getTVContentInsets(
  size: TVSurfaceSize,
  railWidth: number,
): TVOverscanInsets {
  const overscan = getTVOverscanInsets(size);
  const gutter = tvOverscanMetrics.minGutter;

  return {
    top: Math.max(overscan.top, gutter),
    bottom: Math.max(overscan.bottom, gutter),
    left: Math.max(overscan.left - Math.max(0, railWidth), gutter),
    right: Math.max(overscan.right, gutter),
  };
}
