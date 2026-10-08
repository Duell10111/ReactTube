import assert from "node:assert/strict";
import test from "node:test";

import {
  getLoudnessDb,
  getLoudnessGain,
  parseLoudnessNormalizationMode,
} from "../src/utils/music/LoudnessNormalization.ts";

const closeTo = (actual, expected) =>
  assert.ok(
    Math.abs(actual - expected) < 0.001,
    `expected ${actual} to be close to ${expected}`,
  );

test("prefers the per-format loudness over the player config", () => {
  assert.equal(
    getLoudnessDb(
      {player_config: {audio_config: {loudness_db: 5}}},
      {loudness_db: 0.99},
    ),
    0.99,
  );
});

test("derives the offset from absolute LKFS when only that is known", () => {
  // VISIONOS omits `audio_config.loudness_db` but keeps the absolute value.
  closeTo(
    getLoudnessDb(
      {player_config: {audio_config: {perceptual_loudness_db: -13.01}}},
      {track_absolute_loudness_lkfs: -10},
    ),
    4,
  );
  closeTo(
    getLoudnessDb(
      {player_config: {audio_config: {perceptual_loudness_db: -13.01}}},
      undefined,
    ),
    0.99,
  );
  assert.equal(getLoudnessDb(undefined, {loudness_db: Number.NaN}), undefined);
});

test("attenuates loud tracks and leaves headroom for quiet ones", () => {
  // At the reference level only the headroom is removed: -4 dB.
  closeTo(getLoudnessGain(0, "standard"), Math.pow(10, -4 / 20));
  // A loud track is attenuated by its offset plus the headroom.
  closeTo(getLoudnessGain(6, "standard"), Math.pow(10, -10 / 20));
  // A quiet track is attenuated less ...
  closeTo(getLoudnessGain(-3, "standard"), Math.pow(10, -1 / 20));
  // ... but never boosted above full volume.
  assert.equal(getLoudnessGain(-10, "standard"), 1);
  assert.ok(getLoudnessGain(-6, "strong") < 1);
});

test("keeps the gain in a usable range and handles missing data", () => {
  assert.equal(getLoudnessGain(60, "strong"), 0.1);
  assert.equal(getLoudnessGain(6, "off"), 1);
  closeTo(getLoudnessGain(undefined, "standard"), Math.pow(10, -4 / 20));
});

test("falls back to the default mode for unknown settings", () => {
  assert.equal(parseLoudnessNormalizationMode(undefined), "standard");
  assert.equal(parseLoudnessNormalizationMode("toString"), "standard");
  assert.equal(parseLoudnessNormalizationMode("off"), "off");
});
