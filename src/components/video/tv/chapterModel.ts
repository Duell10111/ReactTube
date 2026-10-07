import type {YTChapter} from "@/extraction/Types";

type ChapterRange = Pick<YTChapter, "startDuration" | "endDuration">;

/**
 * Index of the chapter that contains `seconds`, or -1 before the first one or
 * without a known position. The last chapter stays active up to and past the
 * reported duration, because the final progress events of a video often land a
 * fraction of a second beyond it.
 */
export function findActiveChapterIndex(
  chapters: readonly ChapterRange[],
  seconds: number | undefined,
): number {
  if (seconds === undefined || !Number.isFinite(seconds)) {
    return -1;
  }

  // Chapters arrive in playback order, so the last one that has started is
  // the active one. Searching from the end avoids depending on `endDuration`,
  // which the extraction only derives after the fact.
  for (let index = chapters.length - 1; index >= 0; index--) {
    if (seconds >= chapters[index].startDuration) {
      return index;
    }
  }

  return -1;
}

/** How far playback has advanced inside `chapter`, from 0 to 1. */
export function getChapterProgress(
  chapter: ChapterRange,
  seconds: number,
): number {
  const length = chapter.endDuration - chapter.startDuration;

  if (!(length > 0)) {
    return 0;
  }

  return Math.min(1, Math.max(0, (seconds - chapter.startDuration) / length));
}

/**
 * A chapter timestamp the way the seek bar reads it: `m:ss`, or `h:mm:ss` once
 * the video runs for an hour or longer. Hours are decided by the whole video,
 * so all timestamps in one list share a format.
 */
export function formatChapterTimestamp(
  seconds: number,
  videoDurationSeconds = seconds,
): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = String(total % 60).padStart(2, "0");

  if (videoDurationSeconds >= 3600) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${secs}`;
  }

  return `${Math.floor(total / 60)}:${secs}`;
}
