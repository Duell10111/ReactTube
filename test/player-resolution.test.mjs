import assert from "node:assert/strict";
import test from "node:test";

import {de} from "../src/localization/de.ts";
import {en} from "../src/localization/en.ts";
import {
  clampPlaybackResumePosition,
  playbackStartAfterReload,
  playbackStartAt,
} from "../src/utils/PlaybackPosition.ts";
import {
  getPlayerResolutionLabel,
  parsePlayerResolution,
  playerResolutions,
} from "../src/utils/PlayerResolution.ts";

test("keeps existing resolution preferences and the default YouTube HLS mode", () => {
  assert.equal(parsePlayerResolution({}).key, "hls");
  assert.equal(parsePlayerResolution({hlsEnabled: false}).key, "http");
  assert.equal(parsePlayerResolution({localHlsEnabled: true}).key, "hlsLocal");
  assert.equal(
    parsePlayerResolution({localHlsEnabled: true, av1Enabled: true}).key,
    "hlsLocalAv1",
  );
  assert.equal(
    parsePlayerResolution({
      sabrEnabled: true,
      localHlsEnabled: true,
      av1Enabled: true,
    }).key,
    "sabr",
  );
});

test("switching modes clears incompatible flags without changing other preferences", () => {
  let settings = {uiLanguage: "de", autoplayEnabled: false};
  for (const key of [
    "sabr",
    "auto",
    "hls",
    "hlsLocalAv1",
    "http",
    "hlsLocal",
  ]) {
    settings = {...settings, ...playerResolutions[key].settings};
    assert.equal(parsePlayerResolution(settings).key, key);
    assert.equal(settings.uiLanguage, "de");
    assert.equal(settings.autoplayEnabled, false);
    assert.equal(settings.sabrEnabled, key === "sabr");
    assert.equal(settings.av1Enabled, key === "sabr" || key === "hlsLocalAv1");
  }
});

test("the explicit resolution takes precedence over old flags and unknown values fall back safely", () => {
  assert.equal(
    parsePlayerResolution({
      playerResolutionType: "auto",
      sabrEnabled: true,
      av1Enabled: true,
    }).key,
    "auto",
  );
  assert.equal(
    parsePlayerResolution({playerResolutionType: "hls", localHlsEnabled: true})
      .key,
    "hls",
  );
  assert.equal(
    parsePlayerResolution({
      playerResolutionType: "unknown",
      localHlsEnabled: true,
    }).key,
    "hlsLocal",
  );
  assert.equal(
    parsePlayerResolution({playerResolutionType: "constructor"}).key,
    "hls",
  );
});

test("every shared resolution option has English and German labels", () => {
  for (const option of Object.values(playerResolutions)) {
    const labelKey = getPlayerResolutionLabel(option.settings);
    assert.equal(labelKey, option.labelKey);
    assert.ok(en[labelKey]);
    assert.ok(de[labelKey]);
  }
});

test("changing resolution resumes at the playback position instead of the original marker", () => {
  assert.equal(
    playbackStartAfterReload({
      sameVideo: true,
      currentSeconds: 125,
      previousStartSeconds: 30,
      requestedStartSeconds: 30,
    }),
    125,
  );
});

test("changing resolution before progress arrives preserves the start marker", () => {
  assert.equal(
    playbackStartAfterReload({
      sameVideo: true,
      previousStartSeconds: 30,
    }),
    30,
  );
});

test("reloading after seeking to the beginning does not restore an older marker", () => {
  assert.equal(
    playbackStartAfterReload({
      sameVideo: true,
      currentSeconds: 0,
      previousStartSeconds: 30,
    }),
    0,
  );
});

test("a new video uses its own start marker and does not inherit playback progress", () => {
  const previous = {
    sameVideo: false,
    currentSeconds: 125,
    previousStartSeconds: 30,
  };
  assert.equal(playbackStartAfterReload(previous), undefined);
  assert.equal(
    playbackStartAfterReload({...previous, requestedStartSeconds: 10}),
    10,
  );
});

test("a fallback near the end preserves playback while an old saved marker restarts", () => {
  assert.equal(clampPlaybackResumePosition(98, 100, true), 98);
  assert.equal(clampPlaybackResumePosition(98, 100), undefined);
});

test("a start keeps the origin it was set with", () => {
  assert.deepEqual(playbackStartAt(98), {seconds: 98, fromPlayback: true});
  assert.deepEqual(playbackStartAt(undefined), {
    seconds: undefined,
    fromPlayback: false,
  });
});

test("a position at or beyond the duration cannot strand the next source", () => {
  assert.equal(clampPlaybackResumePosition(100, 100, true), undefined);
  assert.equal(clampPlaybackResumePosition(101, 100, true), undefined);
  assert.equal(clampPlaybackResumePosition(30, undefined), 30);
});
