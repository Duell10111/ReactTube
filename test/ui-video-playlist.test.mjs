import assert from "node:assert/strict";
import test from "node:test";

import {findCurrentPlaylistIndex} from "../src/components/video/tv/playlistModel.ts";

const entries = [{id: "a"}, {id: "b"}, {id: "c"}, {id: "b"}];

test("finds the playing video by its id", () => {
  assert.equal(findCurrentPlaylistIndex(entries, "c"), 2);
  assert.equal(findCurrentPlaylistIndex(entries, "a", 2), 0);
});

test("uses the reported index to pick between duplicate entries", () => {
  assert.equal(findCurrentPlaylistIndex(entries, "b"), 1);
  assert.equal(findCurrentPlaylistIndex(entries, "b", 3), 3);
});

test("marks nothing when the playing video is not in the loaded entries", () => {
  assert.equal(findCurrentPlaylistIndex(entries, "z", 1), -1);
  assert.equal(findCurrentPlaylistIndex([], "a", 0), -1);
});

test("falls back to the reported index without a video id", () => {
  assert.equal(findCurrentPlaylistIndex(entries, undefined, 2), 2);
  assert.equal(findCurrentPlaylistIndex(entries, undefined, 4), -1);
  assert.equal(findCurrentPlaylistIndex(entries, undefined, -1), -1);
  assert.equal(findCurrentPlaylistIndex(entries, undefined), -1);
});
