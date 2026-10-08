import assert from "node:assert/strict";
import test from "node:test";

import {resolveVideoDetailFallback} from "../src/extraction/videoInfoFallback.ts";
import {resolveTranslation} from "../src/localization/core.ts";
import {de} from "../src/localization/de.ts";
import {en} from "../src/localization/en.ts";
import {getVideoDetailMetadata} from "../src/ui/patterns/videoDetailModel.ts";

const resources = {en, de};
const formatters = language => ({
  translate: (key, values = {}) =>
    resolveTranslation(language, key, values, resources),
  formatNumber: value =>
    new Intl.NumberFormat(language === "de" ? "de-DE" : "en-US").format(value),
  formatDate: value =>
    new Intl.DateTimeFormat(language === "de" ? "de-DE" : "en-US", {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(value),
});

test("prefers the formatted views and date YouTube sent", () => {
  assert.deepEqual(
    getVideoDetailMetadata(
      {
        short_views: "1.2M views",
        publishDate: "2 days ago",
        viewCount: 1234567,
        publishedAt: "2024-05-01",
      },
      formatters("en"),
    ),
    ["1.2M views", "2 days ago"],
  );
});

test("formats raw views and date when no text exists", () => {
  assert.deepEqual(
    getVideoDetailMetadata(
      {viewCount: 1234567, publishedAt: "2024-05-01"},
      formatters("de"),
    ),
    ["1.234.567 Aufrufe", "01.05.2024"],
  );
  assert.deepEqual(getVideoDetailMetadata({viewCount: 0}, formatters("en")), [
    "0 views",
  ]);
});

test("skips raw values without formatters or with an invalid date", () => {
  assert.deepEqual(getVideoDetailMetadata({viewCount: 5}), []);
  assert.deepEqual(
    getVideoDetailMetadata({publishedAt: "not a date"}, formatters("en")),
    [],
  );
});

test("fills views and date from the stream client response", () => {
  const resolved = resolveVideoDetailFallback(
    {short_views: undefined, publishDate: "", viewCount: undefined},
    {
      short_views: "10 views",
      publishDate: "Jan 1, 2024",
      viewCount: 10,
      publishedAt: "2024-01-01",
    },
  );

  assert.equal(resolved.short_views, "10 views");
  assert.equal(resolved.publishDate, "Jan 1, 2024");
  assert.equal(resolved.viewCount, 10);
  assert.equal(resolved.publishedAt, "2024-01-01");
});
