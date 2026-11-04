import assert from "node:assert/strict";
import test from "node:test";

import {
  getTVChannelLayout,
  getTVChannelTabs,
} from "../src/components/channel/tv/channelModel.ts";
import {getTVChannelHeader} from "../src/extraction/tvChannelHeader.ts";
import {createChannelFeedLoader} from "../src/hooks/channel/channelFeedLoader.ts";
import {de} from "../src/localization/de.ts";
import {en} from "../src/localization/en.ts";

const noTabs = {
  has_home: false,
  has_videos: false,
  has_shorts: false,
  has_live_streams: false,
  has_playlists: false,
};

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((accept, fail) => {
    resolve = accept;
    reject = fail;
  });
  return {promise, resolve, reject};
}

function feed(options = {}) {
  const changes = [];
  const loader = createChannelFeedLoader({
    firstPage: async () => ["first"],
    nextPage: async () => undefined,
    extract: page => page,
    onChange: state => changes.push(state),
    ...options,
  });
  return {loader, changes, current: () => changes.at(-1)};
}

test("starts on available content when a channel has no Home tab", () => {
  assert.deepEqual(getTVChannelTabs({...noTabs, has_videos: true}), [
    "Videos",
    "About",
  ]);
  assert.deepEqual(getTVChannelTabs(noTabs), ["About"]);
  assert.deepEqual(
    getTVChannelTabs(
      Object.fromEntries(Object.keys(noTabs).map(key => [key, true])),
    ),
    ["Home", "Videos", "Reels", "Live", "Playlists", "About"],
  );
});

test("reclaims content space on both TV coordinate scales", () => {
  for (const height of [540, 720, 1080]) {
    const layout = getTVChannelLayout(height);
    assert.ok(layout.compactHeight < layout.heroHeight);
    assert.ok(layout.heroHeight - layout.compactHeight >= 160);
    // Tabs and title-safe margins still leave a usable content viewport.
    assert.ok(height - layout.compactHeight - 80 - 64 - 46 >= 240);
  }
});

test("prefers TV channel art and the largest supplied avatar without mutating data", () => {
  const thumbnails = [
    {url: "small", width: 88},
    {url: "large", width: 256},
  ];
  const result = getTVChannelHeader({
    metadata: {
      title: "Creator",
      description: "Original description",
      thumbnail: thumbnails,
    },
    header: {
      tv_banner: [{url: "tv-banner", width: 1920}],
      banner: [{url: "web-banner", width: 2560}],
      channel_handle: "@creator",
      subscribers: "1 Mio. Abonnenten",
      videos_count: "100 Videos",
    },
  });
  assert.equal(result.avatar, "large");
  assert.equal(result.banner, "tv-banner");
  assert.equal(result.metadata, "@creator · 1 Mio. Abonnenten · 100 Videos");
  assert.equal(result.description, "Original description");
  assert.equal(thumbnails[0].url, "small");
});

test("reads modern page-header art and metadata while tolerating incomplete rows", () => {
  const result = getTVChannelHeader({
    metadata: {title: "Creator"},
    header: {
      content: {
        banner: {image: [{url: "page-banner"}]},
        metadata: {
          delimiter: " • ",
          metadata_rows: [
            {
              metadata_parts: [
                {text: "@creator"},
                {text: null},
                {text: "20 videos"},
              ],
            },
            {},
          ],
        },
      },
    },
  });
  assert.equal(result.banner, "page-banner");
  assert.equal(result.metadata, "@creator • 20 videos");
  const empty = getTVChannelHeader({metadata: {}});
  assert.equal(empty.avatar, undefined);
  assert.equal(empty.banner, undefined);
  assert.equal(empty.metadata, undefined);
});

test("turns first-page failure into a retryable error, then replaces it on success", async () => {
  let fail = true;
  const error = new Error("offline");
  const {loader, current} = feed({
    firstPage: async () => {
      if (fail) throw error;
      return [];
    },
  });
  await loader.refresh();
  assert.equal(current().error, error);
  assert.equal(current().loading, false);
  fail = false;
  await loader.refresh();
  assert.deepEqual(current(), {items: [], loading: false});
});

test("ignores an earlier first page that finishes after a newer refresh", async () => {
  const old = deferred();
  let calls = 0;
  const {loader, current} = feed({
    firstPage: () => (++calls === 1 ? old.promise : Promise.resolve(["new"])),
  });
  const first = loader.refresh();
  await loader.refresh();
  old.resolve(["old"]);
  await first;
  assert.deepEqual(current().items, ["new"]);
});

test("coalesces repeated end-of-list events into one continuation request", async () => {
  const next = deferred();
  let calls = 0;
  const {loader, current} = feed({
    nextPage: () => {
      calls++;
      return next.promise;
    },
  });
  await loader.refresh();
  const first = loader.fetchMore();
  await loader.fetchMore();
  assert.equal(calls, 1);
  next.resolve(["second"]);
  await first;
  assert.deepEqual(current().items, ["first", "second"]);
});

test("preserves existing cards and retries the same continuation after a failure", async () => {
  const seen = [];
  const error = new Error("offline");
  const {loader, current} = feed({
    nextPage: async page => {
      seen.push(page);
      if (seen.length === 1) throw error;
      return ["second"];
    },
  });
  await loader.refresh();
  await loader.fetchMore();
  assert.equal(current().paginationError, error);
  assert.deepEqual(current().items, ["first"]);
  await loader.fetchMore();
  assert.equal(seen[0], seen[1]);
  assert.deepEqual(current().items, ["first", "second"]);
  assert.equal(current().paginationError, undefined);
});

test("does not append an old continuation after refreshing the tab", async () => {
  const next = deferred();
  const {loader, current} = feed({nextPage: () => next.promise});
  await loader.refresh();
  const pending = loader.fetchMore();
  await loader.refresh();
  next.resolve(["stale"]);
  await pending;
  assert.deepEqual(current().items, ["first"]);
});

test("does not publish a late response after leaving the tab", async () => {
  const first = deferred();
  const {loader, changes} = feed({firstPage: () => first.promise});
  const pending = loader.refresh();
  loader.dispose();
  const count = changes.length;
  first.resolve(["stale"]);
  await pending;
  assert.equal(changes.length, count);
});

test("keeps TV channel actions and states translated in both UI languages", () => {
  for (const key of [
    "channel.moreAbout",
    "channel.noDescription",
    "channel.empty.title",
    "channel.empty.message",
    "channel.loadMoreError",
    "channel.signInToSubscribe",
    "channel.subscriptionError",
  ]) {
    assert.equal(typeof en[key], "string");
    assert.equal(typeof de[key], "string");
    assert.notEqual(en[key], de[key]);
  }
});
