import assert from "node:assert/strict";
import test from "node:test";

import {
  formatResolutionLabel,
  toPlaybackSize,
} from "../src/utils/PlaybackSize.ts";

test("ignores events without a usable size", () => {
  assert.equal(toPlaybackSize(undefined), undefined);
  assert.equal(toPlaybackSize({}), undefined);
  // iOS bandwidth events only carry a size once a frame is rendered.
  assert.equal(toPlaybackSize({width: 0, height: 0}), undefined);
  assert.equal(toPlaybackSize({width: 1920}), undefined);
});

test("keeps reported sizes as whole pixels", () => {
  assert.deepEqual(toPlaybackSize({width: 1920, height: 1080}), {
    width: 1920,
    height: 1080,
  });
  assert.deepEqual(toPlaybackSize({width: 1279.9, height: 720.2}), {
    width: 1280,
    height: 720,
  });
});

test("labels standard sizes like YouTube", () => {
  assert.equal(formatResolutionLabel({width: 1920, height: 1080}), "1080p");
  assert.equal(formatResolutionLabel({width: 3840, height: 2160}), "2160p");
  assert.equal(formatResolutionLabel({width: 256, height: 144}), "144p");
  // Slightly cropped encodes keep their tier.
  assert.equal(formatResolutionLabel({width: 1916, height: 1076}), "1080p");
});

test("labels portrait videos by their short side", () => {
  assert.equal(formatResolutionLabel({width: 1080, height: 1920}), "1080p");
  assert.equal(formatResolutionLabel({width: 720, height: 1280}), "720p");
});

test("labels letterboxed and 4:3 videos by their YouTube tier", () => {
  assert.equal(formatResolutionLabel({width: 3840, height: 1608}), "2160p");
  assert.equal(formatResolutionLabel({width: 1920, height: 800}), "1080p");
  assert.equal(formatResolutionLabel({width: 1280, height: 534}), "720p");
  assert.equal(formatResolutionLabel({width: 1440, height: 1080}), "1080p");
  assert.equal(formatResolutionLabel({width: 640, height: 480}), "480p");
});

test("falls back to the short side below the smallest tier", () => {
  assert.equal(formatResolutionLabel({width: 160, height: 90}), "90p");
});
