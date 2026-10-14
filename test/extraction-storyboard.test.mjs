import assert from "node:assert/strict";
import test from "node:test";

import {
  getStoryboardFrame,
  pickStoryboard,
} from "../src/extraction/storyboard.ts";

function board(width, height, extra = {}) {
  return {
    template_url: `https://i.ytimg.com/sb/id/storyboard3_L${width}/M$M.jpg`,
    thumbnail_width: width,
    thumbnail_height: height,
    thumbnail_count: 100,
    interval: 2000,
    columns: 10,
    rows: 10,
    ...extra,
  };
}

test("the sharpest level that fits the preview is picked", () => {
  const picked = pickStoryboard([
    board(48, 27, {interval: 0}),
    board(80, 45),
    board(160, 90),
    board(320, 180),
    board(640, 360),
  ]);
  assert.equal(picked?.thumbnailWidth, 320);
});

test("without a fitting level the smallest one is used", () => {
  assert.equal(
    pickStoryboard([board(800, 450), board(640, 360)])?.thumbnailWidth,
    640,
  );
});

test("missing or broken boards give no storyboard", () => {
  assert.equal(pickStoryboard(undefined), undefined);
  assert.equal(pickStoryboard([]), undefined);
  assert.equal(pickStoryboard([board(160, 90, {columns: 0})]), undefined);
});

test("a frame is found by the interval between frames", () => {
  const storyboard = pickStoryboard([
    board(160, 90, {columns: 5, rows: 5, interval: 2000}),
  ]);
  // 61 s / 2 s = frame 30 → sheet 1 (25 per sheet), cell 5 → column 0, row 1.
  assert.deepEqual(getStoryboardFrame(storyboard, 61, 600), {
    url: "https://i.ytimg.com/sb/id/storyboard3_L160/M1.jpg",
    column: 0,
    row: 1,
  });
});

test("a level without interval spreads its frames over the duration", () => {
  const storyboard = pickStoryboard([
    board(48, 27, {interval: 0, thumbnail_count: 100}),
  ]);
  const frame = getStoryboardFrame(storyboard, 300, 600);
  assert.deepEqual([frame.column, frame.row], [0, 5]);
});

test("the frame never runs past the last one", () => {
  const storyboard = pickStoryboard([board(160, 90)]);
  const frame = getStoryboardFrame(storyboard, 10_000, 200);
  assert.deepEqual([frame.column, frame.row], [9, 9]);
  assert.match(frame.url, /M0\.jpg$/);
});
