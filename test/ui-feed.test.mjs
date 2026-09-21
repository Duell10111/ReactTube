import assert from "node:assert/strict";
import test from "node:test";

import {resolveTranslation} from "../src/localization/core.ts";
import {de} from "../src/localization/de.ts";
import {en} from "../src/localization/en.ts";
import {
  buildFeedRows,
  buildFeedSections,
  getFeedCardWidth,
  getFeedMetrics,
  isShelfItem,
} from "../src/ui/patterns/feedLayout.ts";
import {createMediaCardViewModel} from "../src/ui/patterns/mediaCardModel.ts";

const resources = {en, de};
const t = (key, values = {}) =>
  resolveTranslation("en", key, values, resources);
const tDe = (key, values = {}) =>
  resolveTranslation("de", key, values, resources);

function video(overrides = {}) {
  return {
    originalNode: {type: "Video"},
    type: "video",
    id: "video-1",
    title: "A video title",
    thumbnailImage: {
      url: "https://example.test/thumb.jpg",
      width: 16,
      height: 9,
    },
    ...overrides,
  };
}

function shelf(id, elements = []) {
  return {
    originalNode: {type: "Shelf"},
    id,
    title: `Shelf ${id}`,
    data: [],
    parsedData: elements,
    loadMore: () => {},
  };
}

test("builds the metadata line from author, views, and publish date", () => {
  const model = createMediaCardViewModel(
    video({
      author: {id: "channel-1", name: "A channel"},
      short_views: "1.2M views",
      publishDate: "2 days ago",
    }),
    {translate: t},
  );

  assert.deepEqual(model.metadata, ["A channel", "1.2M views", "2 days ago"]);
  assert.equal(model.metadataLine, "A channel · 1.2M views · 2 days ago");
  assert.equal(model.shape, "wide");
  assert.equal(model.aspectRatio, 16 / 9);
});

test("falls back to the precomposed subtitle when no metadata parts exist", () => {
  const model = createMediaCardViewModel(
    video({subtitle: "A channel · 1.2M views"}),
    {translate: t},
  );

  assert.deepEqual(model.metadata, ["A channel · 1.2M views"]);
});

test("shows the duration badge unless the video is live", () => {
  const recorded = createMediaCardViewModel(video({duration: "12:04"}), {
    translate: t,
  });
  const live = createMediaCardViewModel(
    video({duration: "12:04", livestream: true}),
    {translate: t},
  );

  assert.deepEqual(
    recorded.badges.map(badge => badge.id),
    ["duration"],
  );
  assert.deepEqual(
    live.badges.map(badge => ({id: badge.id, label: badge.label})),
    [{id: "live", label: "Live"}],
  );
  assert.equal(live.badges[0].tone, "live");
});

test("adds mix and download badges next to the duration", () => {
  const model = createMediaCardViewModel(
    video({type: "mix", duration: "12:04", downloaded: true}),
    {translate: t},
  );

  assert.deepEqual(
    model.badges.map(badge => badge.id),
    ["duration", "mix", "downloaded"],
  );
});

test("clamps the watch progress and drops it when there is none", () => {
  const started = createMediaCardViewModel(
    video({thumbnailOverlays: {videoProgress: 0.42}}),
    {translate: t},
  );
  const overflowing = createMediaCardViewModel(
    video({thumbnailOverlays: {videoProgress: 1.4}}),
    {translate: t},
  );
  const untouched = createMediaCardViewModel(
    video({thumbnailOverlays: {videoProgress: 0}}),
    {translate: t},
  );

  assert.equal(started.progress, 0.42);
  assert.equal(overflowing.progress, 1);
  assert.equal(untouched.progress, undefined);
});

test("uses a portrait thumbnail for reels and a circle for channels", () => {
  const reel = createMediaCardViewModel(video({type: "reel"}), {translate: t});
  const channel = createMediaCardViewModel(
    {
      originalNode: {type: "Channel"},
      type: "channel",
      id: "channel-1",
      title: "A channel",
      thumbnailImage: {
        url: "https://example.test/avatar.jpg",
        width: 1,
        height: 1,
      },
      subscribers: "120K subscribers",
    },
    {translate: t},
  );

  assert.equal(reel.shape, "portrait");
  assert.equal(reel.aspectRatio, 9 / 16);
  assert.equal(channel.shape, "circle");
  assert.deepEqual(channel.metadata, ["120K subscribers"]);
  assert.equal(channel.badges.length, 0);
  assert.equal(channel.accessibilityHint, "Opens the channel");
});

test("localizes the playlist video count in both languages", () => {
  const playlist = {
    originalNode: {type: "Playlist"},
    type: "playlist",
    id: "playlist-1",
    title: "A playlist",
    thumbnailImage: {
      url: "https://example.test/thumb.jpg",
      width: 16,
      height: 9,
    },
    author: {id: "channel-1", name: "A channel"},
    videoCount: "24",
  };

  const english = createMediaCardViewModel(playlist, {translate: t});
  const german = createMediaCardViewModel(playlist, {translate: tDe});

  assert.deepEqual(english.metadata, ["A channel", "24 videos"]);
  assert.deepEqual(german.metadata, ["A channel", "24 Videos"]);
  assert.deepEqual(
    english.badges.map(badge => badge.label),
    ["24 videos"],
  );
  assert.equal(english.accessibilityHint, "Opens the playlist");
});

test("announces title, metadata, state, and progress but not the duration", () => {
  const model = createMediaCardViewModel(
    video({
      author: {id: "channel-1", name: "A channel"},
      duration: "12:04",
      downloaded: true,
      thumbnailOverlays: {videoProgress: 0.5},
    }),
    {translate: t},
  );

  assert.equal(
    model.accessibilityLabel,
    "A video title, A channel, Downloaded, 50% watched",
  );
  assert.equal(model.accessibilityHint, "Opens the video");
});

test("keeps one column on compact widths and more on wider layouts", () => {
  assert.equal(getFeedMetrics("compact").columns, 1);
  assert.equal(getFeedMetrics("medium").columns, 2);
  assert.equal(getFeedMetrics("expanded").columns, 3);
  assert.equal(getFeedMetrics("tv").columns, 4);
});

test("fills the available width exactly with cards and gaps", () => {
  const metrics = getFeedMetrics("expanded");
  const cardWidth = getFeedCardWidth(1024, metrics);
  const used =
    cardWidth * metrics.columns +
    metrics.gap * (metrics.columns - 1) +
    metrics.padding * 2;

  assert.equal(Math.round(used), 1024);
  assert.equal(getFeedCardWidth(0, metrics), 0);
});

test("groups cards into rows and gives every shelf its own row", () => {
  const rows = buildFeedRows(
    [
      video({id: "a"}),
      video({id: "b"}),
      shelf("shelf-1"),
      video({id: "c"}),
      video({id: "d"}),
      video({id: "e"}),
    ],
    2,
  );

  assert.deepEqual(
    rows.map(row =>
      row.type === "shelf" ? "shelf" : row.items.map(item => item.id).join(""),
    ),
    ["ab", "shelf", "cd", "e"],
  );
  assert.equal(new Set(rows.map(row => row.key)).size, rows.length);
});

test("treats a column count below one as a single column", () => {
  const rows = buildFeedRows([video({id: "a"}), video({id: "b"})], 0);

  assert.equal(rows.length, 2);
});

test("separates shelves from elements", () => {
  assert.equal(isShelfItem(shelf("shelf-1")), true);
  assert.equal(isShelfItem(video()), false);
});

test("groups a feed into titled sections and keeps loose entries in order", () => {
  const sections = buildFeedSections(
    [
      video({id: "loose-1"}),
      shelf("today", [video({id: "a"}), video({id: "b"})]),
      shelf("yesterday", [video({id: "c"})]),
    ],
    2,
  );

  assert.deepEqual(
    sections.map(section => section.title),
    [undefined, "Shelf today", "Shelf yesterday"],
  );
  assert.deepEqual(
    sections[1].data.map(row => row.items.map(item => item.id).join("")),
    ["ab"],
  );
  assert.equal(new Set(sections.map(section => section.key)).size, 3);
});
