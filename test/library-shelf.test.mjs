import assert from "node:assert/strict";
import test from "node:test";

import {
  getLibraryShelfTarget,
  isWatchLaterPlaylistId,
  isWatchLaterShelf,
  newestFirst,
} from "../src/extraction/libraryShelf.ts";

function video(id, playlistId) {
  return {
    type: "video",
    id,
    title: id,
    navEndpoint: playlistId ? {payload: {videoId: id, playlistId}} : undefined,
  };
}

function shelf(items, browseId) {
  return {
    originalNode: {
      type: "Shelf",
      endpoint: browseId ? {payload: {browseId}} : undefined,
    },
    id: "shelf",
    data: [],
    parsedData: items,
    loadMore: () => {},
  };
}

test("recognises Watch later by playlist and browse id", () => {
  assert.equal(isWatchLaterPlaylistId("WL"), true);
  assert.equal(isWatchLaterPlaylistId("VLWL"), true);
  assert.equal(isWatchLaterPlaylistId("LL"), false);
});

test("recognises the Watch later shelf by its entries", () => {
  assert.equal(
    isWatchLaterShelf(shelf([video("a", "WL"), video("b", "WL")])),
    true,
  );
  // History entries can come from Watch later too; one of them is not enough.
  assert.equal(isWatchLaterShelf(shelf([video("a", "WL"), video("b")])), false);
  assert.equal(isWatchLaterShelf(shelf([])), false);
});

test("leads history and playlist shelves to their full list", () => {
  assert.deepEqual(getLibraryShelfTarget(shelf([video("a")], "FEhistory")), {
    type: "history",
  });
  assert.deepEqual(getLibraryShelfTarget(shelf([video("a")], "VLLL")), {
    type: "playlist",
    playlistId: "LL",
  });
  assert.deepEqual(getLibraryShelfTarget(shelf([video("a", "WL")])), {
    type: "playlist",
    playlistId: "WL",
  });
  assert.equal(getLibraryShelfTarget(shelf([video("a")])), undefined);
});

test("orders pages newest first and keeps repeated entries once", () => {
  const ordered = newestFirst([
    [video("oldest"), video("b")],
    [video("b"), video("newest")],
  ]);

  assert.deepEqual(
    ordered.map(item => item.id),
    ["newest", "b", "oldest"],
  );
});
