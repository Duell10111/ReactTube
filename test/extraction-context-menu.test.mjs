import assert from "node:assert/strict";
import test from "node:test";

import {getContextMenuType} from "../src/extraction/contextMenu.ts";

test("maps long-press menu endpoints to their menu actions", () => {
  assert.equal(
    getContextMenuType({name: "addToPlaylistEndpoint"}),
    "addToPlaylist",
  );
  assert.equal(
    getContextMenuType({name: "playlistEditEndpoint"}),
    "addToWatchLater",
  );
  assert.equal(getContextMenuType({name: "watchEndpoint"}), "watch");
  assert.equal(getContextMenuType({name: "feedbackEndpoint"}), "feedback");
});

test("tells channel links apart from other browse links", () => {
  assert.equal(
    getContextMenuType({
      name: "browseEndpoint",
      payload: {browseId: "UCXuqSBlHAE6Xw-yeJA0Tunw"},
    }),
    "channel",
  );
  assert.equal(
    getContextMenuType({name: "browseEndpoint", payload: {browseId: "VLWL"}}),
    "browse",
  );
});

test("leaves unknown endpoints without a type", () => {
  assert.equal(getContextMenuType({name: "signalServiceEndpoint"}), undefined);
  assert.equal(getContextMenuType(undefined), undefined);
});
