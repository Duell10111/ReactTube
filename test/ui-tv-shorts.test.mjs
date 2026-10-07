import assert from "node:assert/strict";
import test from "node:test";

import {
  appendShortIds,
  interpretShortsRemoteEvent,
  shortIdFromEndpoint,
  shouldPrefetchShorts,
  stepShortIndex,
} from "../src/components/shorts/tv/shortsQueueModel.ts";

test("reads the video id of a reel endpoint", () => {
  assert.equal(shortIdFromEndpoint({payload: {videoId: "abc"}}), "abc");
  assert.equal(shortIdFromEndpoint("xyz"), "xyz");
  assert.equal(shortIdFromEndpoint({payload: {}}), undefined);
  assert.equal(shortIdFromEndpoint({payload: {videoId: ""}}), undefined);
  assert.equal(shortIdFromEndpoint(undefined), undefined);
});

test("appends new shorts in order and skips duplicates", () => {
  assert.deepEqual(appendShortIds(["a"], ["a", "b", undefined, "c", "b"]), [
    "a",
    "b",
    "c",
  ]);
});

test("returns a fresh queue even when nothing new arrives", () => {
  const existing = ["a", "b"];
  const result = appendShortIds(existing, ["b"]);
  assert.deepEqual(result, ["a", "b"]);
  assert.notEqual(result, existing);
});

test("steps through the queue and stops at both ends", () => {
  assert.equal(stepShortIndex(0, "next", 3), 1);
  assert.equal(stepShortIndex(2, "next", 3), 2);
  assert.equal(stepShortIndex(1, "previous", 3), 0);
  assert.equal(stepShortIndex(0, "previous", 3), 0);
  assert.equal(stepShortIndex(0, "next", 0), 0);
});

test("prefetches when the end of the queue comes close", () => {
  assert.equal(shouldPrefetchShorts(0, 1), true);
  assert.equal(shouldPrefetchShorts(0, 10), false);
  assert.equal(shouldPrefetchShorts(7, 10), true);
  assert.equal(shouldPrefetchShorts(6, 10), false);
});

test("maps tvOS presses to shorts intents", () => {
  assert.equal(interpretShortsRemoteEvent({eventType: "down"}, "ios"), "next");
  assert.equal(
    interpretShortsRemoteEvent({eventType: "up"}, "ios"),
    "previous",
  );
  assert.equal(
    interpretShortsRemoteEvent({eventType: "playPause"}, "ios"),
    "togglePlay",
  );
  assert.equal(
    interpretShortsRemoteEvent({eventType: "left"}, "ios"),
    undefined,
  );
  assert.equal(
    interpretShortsRemoteEvent({eventType: "swipeDown"}, "ios"),
    undefined,
  );
});

test("counts an Android TV key only once, on release", () => {
  assert.equal(
    interpretShortsRemoteEvent(
      {eventType: "down", eventKeyAction: 0},
      "android",
    ),
    undefined,
  );
  assert.equal(
    interpretShortsRemoteEvent(
      {eventType: "down", eventKeyAction: 1},
      "android",
    ),
    "next",
  );
});
