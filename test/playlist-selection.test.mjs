import assert from "node:assert/strict";
import test from "node:test";

import {
  diffPlaylistSelection,
  normalizePlaylistId,
} from "../src/hooks/playlist/playlistSelection.ts";

test("strips the browse prefix from playlist ids", () => {
  assert.equal(normalizePlaylistId("VLPL123"), "PL123");
  assert.equal(normalizePlaylistId("PL123"), "PL123");
  assert.equal(normalizePlaylistId("WL"), "WL");
});

test("adds only newly ticked playlists", () => {
  assert.deepEqual(diffPlaylistSelection(["PL1"], ["PL1", "PL2"]), {
    add: ["PL2"],
    remove: [],
  });
});

test("removes playlists that were unticked", () => {
  assert.deepEqual(diffPlaylistSelection(["PL1", "WL"], ["WL"]), {
    add: [],
    remove: ["PL1"],
  });
});

test("does nothing when the selection is unchanged", () => {
  assert.deepEqual(diffPlaylistSelection(["VLPL1"], ["PL1"]), {
    add: [],
    remove: [],
  });
});
