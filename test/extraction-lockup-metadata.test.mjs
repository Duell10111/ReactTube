import assert from "node:assert/strict";
import test from "node:test";

import {
  isDurationLabel,
  parseLockupMetadataRows,
  parseLockupThumbnailBadges,
} from "../src/extraction/lockupMetadata.ts";

/** One metadata part, the way a lockup nests its texts. */
function part(value) {
  return {text: {text: value}};
}

function rows(...values) {
  return values.map(parts => ({metadata_parts: parts.map(part)}));
}

/** A row that carries nothing but a badge ("Auto-dubbed"). */
function badgeOnlyRow() {
  return {metadata_parts: []};
}

test("reads author, views, and publish date from a video lockup", () => {
  assert.deepEqual(
    parseLockupMetadataRows(rows(["Alex Goot"], ["6.5M", "14y ago"])),
    {author: "Alex Goot", count: "6.5M", published: "14y ago"},
  );
});

test("keeps the viewer count of a live lockup that has no date", () => {
  assert.deepEqual(
    parseLockupMetadataRows(rows(["Lofi Girl"], ["13K watching"])),
    {author: "Lofi Girl", count: "13K watching", published: undefined},
  );
});

test("skips rows that carry only badges", () => {
  assert.deepEqual(
    parseLockupMetadataRows([
      ...rows(["Holm Dressler"], ["580K", "10y ago"]),
      badgeOnlyRow(),
    ]),
    {author: "Holm Dressler", count: "580K", published: "10y ago"},
  );
});

test("takes only the owner from a playlist lockup that labels itself", () => {
  assert.deepEqual(
    parseLockupMetadataRows(
      rows(["Alex Goot", "Playlist"], ["View full playlist"]),
    ),
    {author: "Alex Goot", count: "View full playlist", published: undefined},
  );
});

test("returns nothing for a lockup without metadata rows", () => {
  assert.deepEqual(parseLockupMetadataRows(undefined), {});
  assert.deepEqual(parseLockupMetadataRows([badgeOnlyRow()]), {});
});

test("reads the duration a lockup draws on its thumbnail", () => {
  assert.deepEqual(
    parseLockupThumbnailBadges([
      {
        badges: [
          {
            text: "1:16:15",
            badge_style: "THUMBNAIL_OVERLAY_BADGE_STYLE_DEFAULT",
            icon_name: "MUSIC",
          },
        ],
        progress_bar: null,
      },
    ]),
    {livestream: false, duration: "1:16:15"},
  );
});

test("reads a live lockup as live instead of as a duration", () => {
  assert.deepEqual(
    parseLockupThumbnailBadges([
      {
        badges: [
          {
            text: "LIVE",
            badge_style: "THUMBNAIL_OVERLAY_BADGE_STYLE_LIVE",
            icon_name: "LIVE",
          },
        ],
      },
    ]),
    {livestream: true},
  );
});

test("drops decoration badges beside the duration", () => {
  assert.deepEqual(
    parseLockupThumbnailBadges([
      {
        badges: [
          {text: "33:48", badge_style: "THUMBNAIL_OVERLAY_BADGE_STYLE_DEFAULT"},
        ],
      },
      {
        badges: [
          {text: "New", badge_style: "THUMBNAIL_OVERLAY_BADGE_STYLE_SPECIAL"},
        ],
      },
    ]),
    {livestream: false, duration: "33:48"},
  );
});

test("reads the entry count of a playlist lockup", () => {
  assert.deepEqual(
    parseLockupThumbnailBadges([
      {
        badges: [
          {
            text: "20 videos",
            badge_style: "THUMBNAIL_OVERLAY_BADGE_STYLE_DEFAULT",
            icon_name: "PLAYLISTS",
          },
        ],
      },
    ]),
    {livestream: false, videoCount: "20"},
  );
});

test("keeps the grouping of a phrased entry count", () => {
  assert.deepEqual(
    parseLockupThumbnailBadges([
      {badges: [{text: "1,234 videos", icon_name: "PLAYLISTS"}]},
    ]),
    {livestream: false, videoCount: "1,234"},
  );
});

test("reads watch progress as a fraction and ignores an unwatched bar", () => {
  assert.deepEqual(
    parseLockupThumbnailBadges([{progress_bar: {start_percent: 42}}]),
    {livestream: false, progress: 0.42},
  );
  assert.deepEqual(
    parseLockupThumbnailBadges([{progress_bar: {start_percent: 0}}]),
    {livestream: false},
  );
});

test("returns nothing for a lockup without overlays", () => {
  assert.deepEqual(parseLockupThumbnailBadges(undefined), {livestream: false});
});

test("tells a duration apart from the other badge texts", () => {
  assert.ok(isDurationLabel("4:46"));
  assert.ok(isDurationLabel("3:11:26"));
  assert.ok(!isDurationLabel("LIVE"));
  assert.ok(!isDurationLabel("20 videos"));
  assert.ok(!isDurationLabel(undefined));
});
