/**
 * YouTube's storyboards: the sprite sheets of small frames behind the preview
 * above the seek bar. Kept free of React Native and youtubei.js runtime code so
 * the frame math can be tested on its own.
 */

/** One storyboard level as youtubei.js parses it from the player response. */
export interface StoryboardBoard {
  template_url: string;
  thumbnail_width: number;
  thumbnail_height: number;
  thumbnail_count: number;
  /** Milliseconds between two frames; 0 on the coarse level 0. */
  interval: number;
  columns: number;
  rows: number;
}

export interface YTStoryboard {
  /** Sheet URL with `$M` in place of the sheet index. */
  templateUrl: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
  thumbnailCount: number;
  intervalMs: number;
  columns: number;
  rows: number;
}

export interface StoryboardFrame {
  url: string;
  column: number;
  row: number;
}

/**
 * Wider frames than this are wasted on a preview a few centimeters wide, and
 * each of their sheets is a much larger download while scrubbing.
 */
const MAX_PREVIEW_WIDTH = 320;

/**
 * Picks the sharpest level that is still small enough for the preview. Live
 * streams have no fixed boards and are left out by the caller.
 */
export function pickStoryboard(
  boards: readonly StoryboardBoard[] | undefined,
): YTStoryboard | undefined {
  const usable = (boards ?? []).filter(
    board =>
      board.template_url &&
      board.thumbnail_width > 0 &&
      board.thumbnail_height > 0 &&
      board.thumbnail_count > 0 &&
      board.columns > 0 &&
      board.rows > 0,
  );
  if (usable.length === 0) {
    return undefined;
  }
  const fitting = usable.filter(
    board => board.thumbnail_width <= MAX_PREVIEW_WIDTH,
  );
  // The widest fitting level, or the smallest one if none fits.
  const board =
    fitting.length > 0
      ? fitting.reduce((best, next) =>
          next.thumbnail_width > best.thumbnail_width ? next : best,
        )
      : usable.reduce((best, next) =>
          next.thumbnail_width < best.thumbnail_width ? next : best,
        );

  return {
    templateUrl: board.template_url,
    thumbnailWidth: board.thumbnail_width,
    thumbnailHeight: board.thumbnail_height,
    thumbnailCount: board.thumbnail_count,
    intervalMs: board.interval,
    columns: board.columns,
    rows: board.rows,
  };
}

/** The sheet and the cell in it that show the video at `seconds`. */
export function getStoryboardFrame(
  storyboard: YTStoryboard,
  seconds: number,
  durationSeconds: number,
): StoryboardFrame {
  const time = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const rawIndex =
    storyboard.intervalMs > 0
      ? Math.floor((time * 1000) / storyboard.intervalMs)
      : durationSeconds > 0
        ? Math.floor((time / durationSeconds) * storyboard.thumbnailCount)
        : 0;
  const index = Math.min(rawIndex, storyboard.thumbnailCount - 1);
  const perSheet = storyboard.columns * storyboard.rows;
  const sheet = Math.floor(index / perSheet);
  const cell = index % perSheet;

  return {
    url: storyboard.templateUrl.replace("$M", String(sheet)),
    column: cell % storyboard.columns,
    row: Math.floor(cell / storyboard.columns),
  };
}
