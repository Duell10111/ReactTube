import assert from "node:assert/strict";
import test from "node:test";

import {getLockupPlaylistType} from "../src/extraction/lockupMetadata.ts";
import {resolveTranslation} from "../src/localization/core.ts";
import {de} from "../src/localization/de.ts";
import {en} from "../src/localization/en.ts";
import {
  buildFeedRows,
  buildFeedSections,
  isChannelShelf,
  isReelShelf,
  getFeedCardWidth,
  getFeedLayoutClass,
  getFeedGridLayout,
  getFeedMetrics,
  getTVCardThumbnailWidth,
  getTVCardWidthForVideoHeight,
  isReelGrid,
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

test("marks a short cropped out of its portrait shape with a badge", () => {
  const short = video({type: "reel"});
  const cropped = createMediaCardViewModel(short, {
    translate: t,
    thumbnailAspectRatio: 16 / 9,
  });
  const portrait = createMediaCardViewModel(short, {translate: t});
  const croppedVideo = createMediaCardViewModel(video(), {
    translate: t,
    thumbnailAspectRatio: 1,
  });

  assert.equal(cropped.aspectRatio, 16 / 9);
  assert.equal(cropped.badges[0]?.id, "shorts");
  assert.equal(cropped.badges[0]?.label, "Shorts");
  assert.ok(cropped.accessibilityLabel.includes("Shorts"));
  assert.ok(!portrait.badges.some(badge => badge.id === "shorts"));
  assert.ok(!croppedVideo.badges.some(badge => badge.id === "shorts"));
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

test("shows the mix badge for playlist lockups in both languages", () => {
  const mix = video({
    originalNode: {type: "LockupView"},
    type: getLockupPlaylistType("RDvideo-1"),
    id: "RDvideo-1",
  });

  for (const translate of [t, tDe]) {
    const model = createMediaCardViewModel(mix, {translate});

    assert.equal(model.kind, "mix");
    assert.deepEqual(model.badges, [
      {id: "mix", label: "Mix", tone: "neutral", icon: "playlist-play"},
    ]);
    assert.ok(model.accessibilityLabel.includes("Mix"));
  }
});

test("shows the resolution badge before the duration and drops it otherwise", () => {
  const uhd = createMediaCardViewModel(
    video({duration: "12:04", resolutionBadge: "4K"}),
    {translate: t},
  );
  const eightK = createMediaCardViewModel(
    video({duration: "12:04", resolutionBadge: "8K"}),
    {translate: t},
  );
  const hd = createMediaCardViewModel(video({duration: "12:04"}), {
    translate: t,
  });

  assert.deepEqual(
    uhd.badges.map(badge => ({id: badge.id, label: badge.label})),
    [
      {id: "resolution", label: "4K"},
      {id: "duration", label: "12:04"},
    ],
  );
  assert.equal(eightK.badges[0].label, "8K");
  assert.ok(uhd.accessibilityLabel.includes("4K"));
  assert.ok(!hd.badges.some(badge => badge.id === "resolution"));
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

  const single = {...playlist, videoCount: "1"};
  assert.deepEqual(createMediaCardViewModel(single, {translate: t}).metadata, [
    "A channel",
    "1 video",
  ]);
  assert.deepEqual(
    createMediaCardViewModel(single, {translate: tDe}).badges.map(
      badge => badge.label,
    ),
    ["1 Video"],
  );
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

test("keeps shelves horizontal on TV and flattens them on touch layouts", () => {
  assert.equal(getFeedMetrics("tv").shelfPresentation, "horizontal");
  assert.equal(getFeedMetrics("compact").shelfPresentation, "flattened");
  assert.equal(getFeedMetrics("medium").shelfPresentation, "flattened");
  assert.equal(getFeedMetrics("expanded").shelfPresentation, "flattened");
});

test("flattens a shelf into titled card rows", () => {
  const rows = buildFeedRows(
    [
      shelf("recommended", [
        video({id: "a"}),
        video({id: "b"}),
        video({id: "c"}),
      ]),
    ],
    2,
    "flattened",
  );

  assert.deepEqual(
    rows.map(row =>
      row.type === "header"
        ? row.title
        : row.items.map(item => item.id).join(""),
    ),
    ["Shelf recommended", "ab", "c"],
  );
});

test("never starts a card row with the tail of the previous shelf", () => {
  const rows = buildFeedRows(
    [shelf("first", [video({id: "a"})]), shelf("second", [video({id: "b"})])],
    2,
    "flattened",
  );

  assert.deepEqual(
    rows.map(row => row.type),
    ["header", "cards", "header", "cards"],
  );
});

test("drops an empty shelf instead of leaving a title behind", () => {
  assert.deepEqual(buildFeedRows([shelf("empty")], 2, "flattened"), []);
});

test("keeps a shorts shelf horizontal even on touch layouts", () => {
  const shorts = shelf("shorts", [
    video({id: "s1", type: "reel"}),
    video({id: "s2", type: "reel"}),
  ]);

  assert.equal(isReelShelf(shorts), true);
  assert.equal(isReelShelf(shelf("mixed", [video({id: "a"})])), false);
  assert.deepEqual(
    buildFeedRows([shorts], 2, "flattened").map(row => row.type),
    ["shelf"],
  );
});

test("keeps a channel shelf horizontal even on touch layouts", () => {
  const channel = id => ({
    originalNode: {type: "Channel"},
    type: "channel",
    id,
    title: `Channel ${id}`,
    thumbnailImage: {url: "https://example.test/a.jpg", width: 1, height: 1},
  });
  const channels = shelf("channels", [channel("c1"), channel("c2")]);

  assert.equal(isChannelShelf(channels), true);
  assert.equal(
    isChannelShelf(shelf("mixed", [channel("c1"), video({id: "a"})])),
    false,
  );
  assert.deepEqual(
    buildFeedRows([channels], 1, "flattened").map(row => row.type),
    ["shelf"],
  );
});

test("sizes touch channel cards so several avatars share a row", () => {
  assert.ok(getFeedMetrics("compact").channelCardWidth * 3 < 390);
  assert.equal(
    getFeedMetrics("tv").channelCardWidth,
    getFeedMetrics("tv").shelfCardWidth,
  );
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

test("lays a feed out by the width it occupies, not by the window", () => {
  // Up next beside a player on a tablet: a third of an expanded screen is a
  // compact feed, and three columns of cards would not fit into it.
  assert.equal(getFeedLayoutClass(420, "expanded"), "compact");
  assert.equal(getFeedMetrics(getFeedLayoutClass(420, "expanded")).columns, 1);
  assert.equal(getFeedLayoutClass(1200, "expanded"), "expanded");
});

test("keeps the window layout class before the first measurement and on TV", () => {
  assert.equal(getFeedLayoutClass(0, "expanded"), "expanded");
  // The TV content plane is translated, never resized, so it keeps its class.
  assert.equal(getFeedLayoutClass(500, "tv"), "tv");
});

test("keeps every row key when a continuation fills the last row", () => {
  // The rows a page produces have to survive the next page, including the
  // partly filled last one. A key that changes unmounts that row, and on TV the
  // focused card inside it goes with it — focus falls back to the first card,
  // which reads as the feed jumping to the top while more results load.
  const first = Array.from({length: 6}, (_value, index) =>
    video({id: `first-${index}`}),
  );
  const second = first.concat(
    Array.from({length: 6}, (_value, index) => video({id: `second-${index}`})),
  );

  const before = buildFeedRows(first, 4).map(row => row.key);
  const after = buildFeedRows(second, 4).map(row => row.key);

  assert.equal(before.length, 2);
  assert.deepEqual(after.slice(0, before.length), before);
  assert.equal(new Set(after).size, after.length);
});

test("keeps card row keys unique when the same entry repeats", () => {
  const rows = buildFeedRows([video({id: "a"}), video({id: "a"})], 1);

  assert.equal(new Set(rows.map(row => row.key)).size, 2);
});

test("recognizes a feed made only of shorts as a reel grid", () => {
  const reel = id => video({id, type: "reel"});

  assert.equal(isReelGrid([reel("a"), reel("b")]), true);
  assert.equal(isReelGrid([]), false);
  assert.equal(isReelGrid([reel("a"), video({id: "b"})]), false);
  assert.equal(isReelGrid([reel("a"), shelf("s", [reel("b")])]), false);
});

// Thumbnail height of a TV card, from its width and thumbnail aspect ratio.
const tvThumbnailHeight = (cardWidth, aspectRatio) =>
  getTVCardThumbnailWidth(cardWidth) / aspectRatio;

test("TV cards can match the height of a video card at any crop", () => {
  for (const aspectRatio of [9 / 16, 1]) {
    for (const videoWidth of [300, 420, 433.5, 600]) {
      const width = getTVCardWidthForVideoHeight(videoWidth, aspectRatio);

      assert.ok(
        Math.abs(
          tvThumbnailHeight(width, aspectRatio) -
            tvThumbnailHeight(videoWidth, 16 / 9),
        ) < 0.01,
      );
    }
  }
});

test("TV shorts between videos take the shape of a video card", () => {
  const tv = getFeedMetrics("tv");

  assert.equal(tv.mixedReelAspectRatio, 16 / 9);
  assert.ok(Math.abs(tv.mixedReelCardWidth - tv.shelfCardWidth) < 1);
  assert.equal(
    tvThumbnailHeight(tv.mixedReelCardWidth, tv.mixedReelAspectRatio),
    tvThumbnailHeight(tv.shelfCardWidth, 16 / 9),
  );
});

test("TV shorts-only cards stay readable and fit below a channel's tabs", () => {
  const tv = getFeedMetrics("tv");

  // Portrait thumbnail plus the text block must stay well below the roughly
  // 650 px left under an expanded channel hero and its tab bar.
  assert.ok(tvThumbnailHeight(tv.reelCardWidth, 9 / 16) + 160 < 650);
});

test("TV reel grids fit as many shorts-only cards as the width allows", () => {
  const tv = getFeedMetrics("tv");
  // A 1920 px wide TV feed with 60 px margins on both sides.
  const videos = getFeedGridLayout("tv", 1800, tv, 0, false);
  const reels = getFeedGridLayout("tv", 1800, tv, 0, true);

  assert.equal(reels.cardWidth, tv.reelCardWidth);
  assert.ok(reels.metrics.columns > videos.metrics.columns);
  // The row never overflows, and no further card would have fit.
  const rowWidth = (columns, width) => columns * width + (columns - 1) * tv.gap;
  assert.ok(rowWidth(reels.metrics.columns, reels.cardWidth) <= 1800);
  assert.ok(rowWidth(reels.metrics.columns + 1, reels.cardWidth) > 1800);
});

test("touch reel grids pack at least three shorts per row with overlaid metadata", () => {
  // iPhone 15 Pro and Pro Max portrait widths, then an 11-inch iPad.
  for (const [layout, width, expected] of [
    ["compact", 393, 3],
    ["compact", 430, 3],
    ["expanded", 820, 5],
  ]) {
    const metrics = getFeedMetrics(layout);
    const grid = getFeedGridLayout(layout, width, metrics, 16, true);
    const {columns, gap} = grid.metrics;

    assert.equal(columns, expected);
    assert.equal(grid.metrics.cardPresentation, "overlay");
    assert.ok(gap < metrics.gap);
    assert.ok(
      Math.abs(columns * grid.cardWidth + (columns - 1) * gap - (width - 16)) <
        0.01,
    );
  }
});

test("touch grids of videos keep their regular columns and metadata below", () => {
  for (const layout of ["compact", "medium", "expanded"]) {
    const metrics = getFeedMetrics(layout);
    const grid = getFeedGridLayout(layout, 1000, metrics, 0, false);

    assert.equal(grid.metrics.columns, metrics.columns);
    assert.equal(grid.metrics.cardPresentation, undefined);
    assert.equal(grid.cardWidth, getFeedCardWidth(1000, metrics, 0));
  }
});
