/**
 * Geometry of the phone seek bar: chapter segments and the scrub preview.
 * Free of React Native so it can be tested on its own.
 */

export interface ChapterSegment {
  startSeconds: number;
  endSeconds: number;
  /** Left edge as a fraction of the bar. */
  startFraction: number;
  /** Width as a fraction of the bar. */
  widthFraction: number;
}

/**
 * Splits the bar at the chapter starts, as YouTube does. Without chapters, or
 * before the duration is known, the bar is one segment. A video whose first
 * chapter starts late still gets a segment from 0, so the bar has no hole.
 */
export function getChapterSegments(
  chapters: readonly {startDuration: number}[] | undefined,
  durationSeconds: number,
): ChapterSegment[] {
  if (!(durationSeconds > 0)) {
    return [
      {startSeconds: 0, endSeconds: 0, startFraction: 0, widthFraction: 1},
    ];
  }
  const starts = Array.from(
    new Set(
      (chapters ?? [])
        .map(chapter => chapter.startDuration)
        .filter(
          start =>
            Number.isFinite(start) && start > 0 && start < durationSeconds,
        ),
    ),
  ).sort((a, b) => a - b);
  const bounds = [0, ...starts, durationSeconds];

  return bounds.slice(0, -1).map((start, index) => {
    const end = bounds[index + 1];
    return {
      startSeconds: start,
      endSeconds: end,
      startFraction: start / durationSeconds,
      widthFraction: (end - start) / durationSeconds,
    };
  });
}

/** How much of `segment` lies before `seconds`, from 0 to 1. */
export function getSegmentFill(
  segment: Pick<ChapterSegment, "startSeconds" | "endSeconds">,
  seconds: number,
): number {
  const length = segment.endSeconds - segment.startSeconds;
  if (!(length > 0) || !Number.isFinite(seconds)) {
    return 0;
  }
  return Math.min(1, Math.max(0, (seconds - segment.startSeconds) / length));
}

/**
 * Left edge of the scrub preview, centered over the finger but kept inside
 * the bar so it is never cut off at either end.
 */
export function getPreviewLeft(
  fraction: number,
  barWidth: number,
  previewWidth: number,
): number {
  const centered = fraction * barWidth - previewWidth / 2;
  return Math.min(Math.max(0, centered), Math.max(0, barWidth - previewWidth));
}
