import assert from "node:assert/strict";
import test from "node:test";

import {parseSiriPlaybackOptions} from "../src/siri/parseSiriPlaybackOptions.ts";

test("leaves the player untouched when Siri sends no options", () => {
  // Siri sends queue location "now" (1) and repeat "unknown" (0) by default.
  assert.deepEqual(
    parseSiriPlaybackOptions({queueLocation: 1, repeatMode: 0}),
    {
      shuffle: undefined,
      repeat: undefined,
      queue: "now",
    },
  );
});

test("maps shuffle and repeat modes", () => {
  assert.deepEqual(
    parseSiriPlaybackOptions({playShuffled: true, repeatMode: 3}),
    {
      shuffle: true,
      repeat: "RepeatOne",
      queue: "now",
    },
  );
  assert.equal(parseSiriPlaybackOptions({repeatMode: 2}).repeat, "RepeatAll");
  assert.equal(parseSiriPlaybackOptions({repeatMode: 1}).repeat, "off");
  assert.equal(parseSiriPlaybackOptions({playShuffled: false}).shuffle, false);
});

test("queues next and later after the current track", () => {
  assert.equal(parseSiriPlaybackOptions({queueLocation: 2}).queue, "next");
  assert.equal(parseSiriPlaybackOptions({queueLocation: 3}).queue, "next");
});
