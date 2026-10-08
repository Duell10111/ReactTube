import assert from "node:assert/strict";
import test from "node:test";

import {
  mergePlaylist,
  planPlaylistMoves,
} from "../src/hooks/watchSync/watchPlaylistMerge.ts";

function applyMoves(list, moves) {
  const result = [...list];
  for (const {videoId, predecessorId} of moves) {
    result.splice(result.indexOf(videoId), 1);
    result.splice(result.indexOf(predecessorId) + 1, 0, videoId);
  }
  return result;
}

const base = ["a", "b", "c"];

test("takes changes made only on the phone", () => {
  assert.deepEqual(mergePlaylist(base, ["a", "c", "d"], base), ["a", "c", "d"]);
});

test("takes changes made only on the watch", () => {
  assert.deepEqual(mergePlaylist(base, base, ["a", "x", "b"]), ["a", "x", "b"]);
});

test("keeps titles both sides added", () => {
  assert.deepEqual(mergePlaylist(base, [...base, "p"], ["w", ...base]), [
    "w",
    "a",
    "b",
    "c",
    "p",
  ]);
});

test("removes and adds at the same time on different sides", () => {
  // "w" follows "b" on the watch; "b" is gone, so it goes behind "a".
  assert.deepEqual(mergePlaylist(base, ["a", "c", "p"], ["a", "b", "w", "c"]), [
    "a",
    "w",
    "c",
    "p",
  ]);
});

test("inserts watch additions after their predecessor in the watch list", () => {
  assert.deepEqual(mergePlaylist(base, ["c", "b", "a"], ["a", "w", "b", "c"]), [
    "c",
    "b",
    "a",
    "w",
  ]);
});

test("uses the watch order when only the watch reordered", () => {
  // "p" follows "c" on the phone and keeps that neighbour.
  assert.deepEqual(mergePlaylist(base, [...base, "p"], ["c", "a", "b"]), [
    "c",
    "p",
    "a",
    "b",
  ]);
});

test("lets the phone order win when both sides reordered", () => {
  assert.deepEqual(mergePlaylist(base, ["b", "a", "c"], ["c", "b", "a"]), [
    "b",
    "a",
    "c",
  ]);
});

test("starts from scratch without a common base", () => {
  assert.deepEqual(mergePlaylist([], ["a", "b"], ["b", "c"]), ["a", "b", "c"]);
});

test("ignores duplicate entries", () => {
  assert.deepEqual(mergePlaylist(base, ["a", "a", "b", "c"], base), [
    "a",
    "b",
    "c",
  ]);
});

test("plans no moves for an unchanged order", () => {
  assert.deepEqual(planPlaylistMoves(["a", "b", "c"], ["a", "b", "c"]), []);
});

test("plans moves that reproduce the target order", () => {
  const cases = [
    [
      ["a", "b", "c", "d"],
      ["d", "a", "b", "c"],
    ],
    [
      ["a", "b", "c", "d"],
      ["b", "a", "d", "c"],
    ],
    [
      ["a", "b", "c", "d", "e"],
      ["e", "d", "c", "b", "a"],
    ],
    [
      ["a", "b", "c"],
      ["a", "c", "b"],
    ],
  ];
  for (const [current, target] of cases) {
    assert.deepEqual(
      applyMoves(current, planPlaylistMoves(current, target)),
      target,
    );
  }
});

function permutations(items) {
  if (items.length <= 1) {
    return [items];
  }
  return items.flatMap((item, index) =>
    permutations([...items.slice(0, index), ...items.slice(index + 1)]).map(
      rest => [item, ...rest],
    ),
  );
}

test("reaches every target order from every start order", () => {
  const all = permutations(["a", "b", "c", "d", "e"]);
  for (const current of all) {
    for (const target of all) {
      assert.deepEqual(
        applyMoves(current, planPlaylistMoves(current, target)),
        target,
        `${current} -> ${target}`,
      );
    }
  }
});

test("moves a single title with one operation", () => {
  assert.deepEqual(
    planPlaylistMoves(["a", "b", "c", "d"], ["a", "c", "d", "b"]),
    [{videoId: "b", predecessorId: "d"}],
  );
});
