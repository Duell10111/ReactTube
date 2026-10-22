import assert from "node:assert/strict";
import test from "node:test";

import {
  findCurrentPlaylistIndex,
  resolveVideoPlaylist,
} from "../src/components/video/tv/playlistModel.ts";

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

test("the player and end card use the TV playlist shelf and mark the playing video", () => {
  const shelf = {title: "TV playlist", parsedData: entries};
  const video = {
    id: "b",
    playlist: {title: "Playlist", content: [], current_index: 3},
    watchNextSections: [shelf, {parsedData: [{id: "related"}]}],
  };

  assert.deepEqual(resolveVideoPlaylist(video, "Fallback"), {
    title: "TV playlist",
    elements: entries,
    currentIndex: 3,
  });
});

test("a playlist without a TV shelf or related feed still has a row", () => {
  const video = {
    id: "c",
    playlist: {title: "My playlist", content: entries, current_index: 0},
  };

  assert.deepEqual(resolveVideoPlaylist(video, "Fallback"), {
    title: "My playlist",
    elements: entries,
    currentIndex: 2,
  });
});

test("an untitled TV playlist uses the localized fallback", () => {
  const video = {
    id: "a",
    playlist: {title: "Playlist", content: [], current_index: 0},
    watchNextSections: [{parsedData: entries}],
  };

  assert.equal(
    resolveVideoPlaylist(video, "Wiedergabeliste").title,
    "Wiedergabeliste",
  );
});

test("regular recommendations do not become a playlist without playlist context", () => {
  assert.equal(
    resolveVideoPlaylist(
      {
        id: "a",
        watchNextSections: [{title: "Recommended", parsedData: entries}],
      },
      "Playlist",
    ),
    undefined,
  );
});
