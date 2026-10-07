import assert from "node:assert/strict";
import test from "node:test";

import {
  findActiveChapterIndex,
  formatChapterTimestamp,
  getChapterProgress,
} from "../src/components/video/tv/chapterModel.ts";

const chapters = [
  {startDuration: 0, endDuration: 60},
  {startDuration: 60, endDuration: 150},
  {startDuration: 150, endDuration: 300},
];

test("marks the chapter that contains the playing position", () => {
  assert.equal(findActiveChapterIndex(chapters, 0), 0);
  assert.equal(findActiveChapterIndex(chapters, 59.9), 0);
  assert.equal(findActiveChapterIndex(chapters, 60), 1);
  assert.equal(findActiveChapterIndex(chapters, 200), 2);
});

test("keeps the last chapter active past the reported duration", () => {
  assert.equal(findActiveChapterIndex(chapters, 300.4), 2);
});

test("marks no chapter without a position or before the first one", () => {
  assert.equal(findActiveChapterIndex(chapters, undefined), -1);
  assert.equal(findActiveChapterIndex(chapters, Number.NaN), -1);
  assert.equal(
    findActiveChapterIndex([{startDuration: 10, endDuration: 20}], 5),
    -1,
  );
  assert.equal(findActiveChapterIndex([], 5), -1);
});

test("measures progress inside the chapter, clamped to its range", () => {
  assert.equal(getChapterProgress(chapters[1], 60), 0);
  assert.equal(getChapterProgress(chapters[1], 105), 0.5);
  assert.equal(getChapterProgress(chapters[1], 400), 1);
  assert.equal(getChapterProgress(chapters[1], 10), 0);
});

test("reports no progress for a chapter without a known length", () => {
  assert.equal(getChapterProgress({startDuration: 5, endDuration: 5}, 5), 0);
  assert.equal(
    getChapterProgress({startDuration: 5, endDuration: undefined}, 8),
    0,
  );
});

test("formats timestamps like the seek bar, with hours for long videos", () => {
  assert.equal(formatChapterTimestamp(0), "0:00");
  assert.equal(formatChapterTimestamp(75.8), "1:15");
  assert.equal(formatChapterTimestamp(754), "12:34");
  assert.equal(formatChapterTimestamp(75, 3600), "0:01:15");
  assert.equal(formatChapterTimestamp(3725, 4000), "1:02:05");
});
