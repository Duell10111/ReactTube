import assert from "node:assert/strict";
import test from "node:test";

import {parseTileMetadataLines} from "../src/extraction/tileMetadata.ts";

/** A line item that carries text, like an author, a date, or a separator. */
function text(value, accessibilityLabel) {
  return {
    text: {
      text: value,
      accessibility: accessibilityLabel
        ? {accessibility_data: {label: accessibilityLabel}}
        : undefined,
    },
  };
}

/** A count is the only part YouTube gives an accessibility label. */
function count(value, accessibilityLabel) {
  return text(value, accessibilityLabel ?? value);
}

/** A badge ("4K", "CC") is a line item of its own that carries no text. */
function badge() {
  return {text: {text: undefined}};
}

function lines(...rows) {
  return rows.map(items => ({items}));
}

test("reads author, views, and publish date from a plain tile", () => {
  assert.deepEqual(
    parseTileMetadataLines(
      lines(
        [text("Linus Tech Tips")],
        [count("505K views"), text("•"), text("Streamed 7 months ago")],
      ),
    ),
    {
      author: "Linus Tech Tips",
      count: "505K views",
      published: "Streamed 7 months ago",
    },
  );
});

test("skips badges that shift the metadata parts", () => {
  assert.deepEqual(
    parseTileMetadataLines(
      lines(
        [text("Linus Tech Tips")],
        [badge(), badge(), count("2.9M views"), text("•"), text("2 years ago")],
      ),
    ),
    {
      author: "Linus Tech Tips",
      count: "2.9M views",
      published: "2 years ago",
    },
  );
});

test("keeps the publish date of a tile that shows no view count", () => {
  assert.deepEqual(
    parseTileMetadataLines(
      lines([text("Linus Tech Tips")], [badge(), badge(), text("1 month ago")]),
    ),
    {
      author: "Linus Tech Tips",
      count: undefined,
      published: "1 month ago",
    },
  );
});

test("reads the subscriber count of a channel tile", () => {
  assert.deepEqual(
    parseTileMetadataLines(
      lines([text("@Linus_DE")], [count("383 subscribers")]),
    ),
    {author: "@Linus_DE", count: "383 subscribers", published: undefined},
  );
});

test("reads a count that is not preceded by an author", () => {
  assert.deepEqual(
    parseTileMetadataLines(lines([count("702 views"), text("1 year ago")])),
    {author: undefined, count: "702 views", published: "1 year ago"},
  );
});

test("keeps all parts of a tile that puts them on one line", () => {
  assert.deepEqual(
    parseTileMetadataLines(
      lines([
        text("Linus Tech Tips"),
        text("•"),
        count("1.5M views"),
        text("•"),
        text("8 months ago"),
      ]),
    ),
    {
      author: "Linus Tech Tips",
      count: "1.5M views",
      published: "8 months ago",
    },
  );
});

test("treats a lone part as the author", () => {
  assert.deepEqual(parseTileMetadataLines(lines([text("Linus Tech Tips")])), {
    author: "Linus Tech Tips",
    count: undefined,
    published: undefined,
  });
});

test("returns nothing for a tile without metadata lines", () => {
  assert.deepEqual(parseTileMetadataLines(undefined), {});
  assert.deepEqual(parseTileMetadataLines(lines([badge()])), {});
});
