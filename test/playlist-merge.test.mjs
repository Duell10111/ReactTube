import assert from "node:assert/strict";
import test from "node:test";

import {appendUniqueById} from "../src/hooks/playlist/playlistMerge.ts";

test("appends a continuation page without repeating listed playlists", () => {
  const firstPage = [{id: "LL"}, {id: "WL"}, {id: "PL1"}];
  const nextPage = [{id: "LL"}, {id: "WL"}, {id: "PL1"}, {id: "PL2"}];

  assert.deepEqual(
    appendUniqueById(firstPage, nextPage).map(item => item.id),
    ["LL", "WL", "PL1", "PL2"],
  );
});

test("removes duplicates inside a single page", () => {
  assert.deepEqual(
    appendUniqueById([], [{id: "a"}, {id: "b"}, {id: "a"}]).map(i => i.id),
    ["a", "b"],
  );
});

test("keeps the first occurrence of a playlist", () => {
  const first = {id: "a", title: "first"};
  const [kept] = appendUniqueById([first], [{id: "a", title: "second"}]);
  assert.equal(kept, first);
});
