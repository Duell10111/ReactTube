import assert from "node:assert/strict";
import test from "node:test";

import {
  getVideoMenuEntries,
  resolveVideoMenuChannelId,
} from "../src/hooks/general/videoMenuModel.ts";
import {resolveMediaCardAuthorRoute} from "../src/ui/patterns/mediaCardRouting.ts";

const video = overrides => ({
  type: "video",
  id: "video-1",
  title: "Video",
  thumbnailImage: {url: "", width: 0, height: 0},
  author: {id: "UC-author", name: "Author"},
  ...overrides,
});

const channelEntry = browseId => ({
  type: "channel",
  text: "Go to channel",
  navEndpoint: {payload: {browseId}},
});

test("prefers the channel entry of YouTube's context menu", () => {
  assert.equal(
    resolveVideoMenuChannelId(
      video({contextMenu: [channelEntry("UC-context")]}),
    ),
    "UC-context",
  );
});

test("falls back to the author of videos and shorts", () => {
  assert.equal(resolveVideoMenuChannelId(video()), "UC-author");
  assert.equal(resolveVideoMenuChannelId(video({type: "reel"})), "UC-author");
});

test("offers no channel without an author browse ID", () => {
  assert.equal(
    resolveVideoMenuChannelId(video({author: {id: "", name: "Author"}})),
    undefined,
  );
  assert.equal(
    resolveVideoMenuChannelId(video({author: undefined})),
    undefined,
  );
});

test("keeps only actionable context menu entries", () => {
  const entries = getVideoMenuEntries(
    video({
      contextMenu: [
        {type: "watch", text: "Play"},
        {type: "browse", text: "Open"},
        channelEntry("UC-context"),
        {type: "feedback", text: "Not interested"},
        {type: "addToPlaylist", text: "Save"},
        {type: "addToWatchLater", text: "Watch later"},
      ],
    }),
  );

  assert.deepEqual(
    entries.map(entry => entry.type),
    ["addToPlaylist", "addToWatchLater"],
  );
  assert.deepEqual(getVideoMenuEntries(video()), []);
});

test("links the card avatar to the author's channel", () => {
  assert.deepEqual(resolveMediaCardAuthorRoute(video()), {
    routeName: "ChannelScreen",
    params: {channelId: "UC-author"},
  });
  assert.deepEqual(resolveMediaCardAuthorRoute(video({music: true})), {
    routeName: "MusicChannelScreen",
    params: {artistId: "UC-author"},
  });
});

test("leaves the avatar without a target when there is no channel to open", () => {
  assert.equal(
    resolveMediaCardAuthorRoute(video({author: {id: "", name: "Author"}})),
    undefined,
  );
  assert.equal(
    resolveMediaCardAuthorRoute({
      type: "channel",
      id: "UC-channel",
      title: "Channel",
      thumbnailImage: {url: "", width: 0, height: 0},
      author: {id: "UC-channel", name: "Channel"},
    }),
    undefined,
  );
});
