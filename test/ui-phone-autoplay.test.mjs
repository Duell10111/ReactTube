import assert from "node:assert/strict";
import test from "node:test";

import {
  isAutoplayEnabled,
  resolveUpNext,
} from "../src/components/video/phone/phoneAutoplayModel.ts";

const endpoint = videoId => ({payload: {videoId}});

function feedVideo(id, extra = {}) {
  return {
    type: "video",
    id,
    title: `Title ${id}`,
    author: {name: `Channel ${id}`},
    thumbnailImage: {url: `https://img/${id}.jpg`},
    navEndpoint: endpoint(id),
    ...extra,
  };
}

function video({autoplay, playlist} = {}) {
  return {
    playlist,
    originalData: {autoplay_video_endpoint: autoplay ?? null},
  };
}

test("autoplay is on unless it was turned off", () => {
  assert.equal(isAutoplayEnabled({}), true);
  assert.equal(isAutoplayEnabled({autoplayEnabled: true}), true);
  assert.equal(isAutoplayEnabled({autoplayEnabled: false}), false);
});

test("YouTube's autoplay pick plays next, with feed data when known", () => {
  const next = resolveUpNext(video({autoplay: endpoint("b")}), [
    feedVideo("a"),
    feedVideo("b"),
  ]);
  assert.equal(next.videoId, "b");
  assert.equal(next.title, "Title b");
  assert.equal(next.author, "Channel b");
  assert.equal(next.thumbnailUrl, "https://img/b.jpg");
});

test("an autoplay pick outside the feed still plays, without preview", () => {
  const next = resolveUpNext(video({autoplay: endpoint("z")}), [
    feedVideo("a"),
  ]);
  assert.equal(next.videoId, "z");
  assert.equal(next.title, undefined);
});

test("the next playlist entry wins over the autoplay pick", () => {
  const playlist = {
    current_index: 0,
    content: [feedVideo("p1"), feedVideo("p2")],
  };
  const next = resolveUpNext(video({autoplay: endpoint("b"), playlist}), [
    feedVideo("b"),
  ]);
  assert.equal(next.videoId, "p2");
  assert.equal(next.title, "Title p2");
});

test("without an autoplay pick the first video of the feed stands in", () => {
  const next = resolveUpNext(video(), [
    {type: "channel", id: "c", title: "Channel"},
    feedVideo("a"),
  ]);
  assert.equal(next.videoId, "a");
  assert.deepEqual(next.navEndpoint, endpoint("a"));
});

test("with nothing to play there is no up next", () => {
  assert.equal(resolveUpNext(video(), undefined), undefined);
  assert.equal(
    resolveUpNext(video(), [{type: "playlist", id: "pl", title: "List"}]),
    undefined,
  );
});
