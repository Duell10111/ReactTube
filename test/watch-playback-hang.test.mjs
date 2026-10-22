import assert from "node:assert/strict";
import test from "node:test";

import {swiftMethod, watchSource} from "./helpers/watchNative.mjs";

test("P02 never replaces a known duration with a missing one", () => {
  const add = swiftMethod(
    watchSource("DBUtils.swift"),
    "func addDownloadData(",
  );
  const fileBlock = add.slice(
    add.indexOf("if let fURL = fileURL"),
    add.indexOf("if duration > 0"),
  );
  assert.doesNotMatch(fileBlock, /durationMillis/);
  assert.match(add, /if duration > 0 \{\s*video\.durationMillis = duration/);
});

test("P02 crops downloads only when their duration is known", () => {
  const item = swiftMethod(
    watchSource("PlaylistManager.swift"),
    "private func getPlayerItem(",
  );
  assert.match(item, /video\.durationMillis > 0\s*\?\s*TrackEndtime\(/);
  assert.match(item, /: Track\(url: uri, artworkUrl: coverURL\)/);
  assert.match(
    item,
    /CMTime\(value: Int64\(video\.durationMillis\), timescale: 1000\)/,
  );
});
