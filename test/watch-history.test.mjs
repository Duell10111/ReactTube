import assert from "node:assert/strict";
import test from "node:test";

import {
  createWatchHistoryReporter,
  createWatchProgressTracker,
  hasPlaybackTracking,
} from "../src/utils/watchHistory.ts";

function recordingTarget() {
  const calls = [];
  return {
    calls,
    addToWatchHistory: async () => calls.push(["watched"]),
    updateWatchTime: async seconds => calls.push(["time", seconds]),
  };
}

test("requires both stats URLs in the player response", () => {
  const tracking = {
    videostats_playback_url: "https://s.youtube.com/api/stats/playback",
    videostats_watchtime_url: "https://s.youtube.com/api/stats/watchtime",
  };
  assert.equal(
    hasPlaybackTracking({page: [{playback_tracking: tracking}]}),
    true,
  );
  // `tv.getInfo` answers UNPLAYABLE without any tracking (2026-11-19).
  assert.equal(hasPlaybackTracking({page: [{}]}), false);
  assert.equal(
    hasPlaybackTracking({
      page: [{playback_tracking: {videostats_playback_url: "x"}}],
    }),
    false,
  );
  assert.equal(hasPlaybackTracking({}), false);
});

test("marks the video first, then updates the watch time", async () => {
  const target = recordingTarget();
  let loads = 0;
  const report = createWatchHistoryReporter(async () => {
    loads++;
    return target;
  });

  assert.equal(await report(), true);
  assert.equal(await report(42), true);
  assert.deepEqual(target.calls, [["watched"], ["time", 42]]);
  assert.equal(loads, 1);
});

test("sends nothing when signed out", async () => {
  let loads = 0;
  const report = createWatchHistoryReporter(async () => {
    loads++;
    return undefined;
  });

  assert.equal(await report(), false);
  assert.equal(await report(30), false);
  assert.equal(loads, 1);
});

test("retries the load after a failure", async () => {
  const target = recordingTarget();
  let loads = 0;
  const report = createWatchHistoryReporter(async () => {
    loads++;
    if (loads === 1) throw new Error("No client accepted");
    return target;
  });

  await assert.rejects(report(), /No client accepted/);
  assert.equal(await report(), true);
  assert.deepEqual(target.calls, [["watched"]]);
  assert.equal(loads, 2);
});

test("reports progress in 30 second steps and the full duration at the end", async () => {
  const reports = [];
  const tracker = createWatchProgressTracker(async seconds => {
    reports.push(seconds);
  });

  await tracker.progress(0.4);
  assert.equal(tracker.progress(12), undefined);
  assert.equal(tracker.progress(30.4), undefined);
  await tracker.progress(31.7);
  assert.equal(tracker.progress(Number.NaN), undefined);
  await tracker.ended(245);
  assert.equal(tracker.ended(undefined), undefined);

  assert.deepEqual(reports, [undefined, 31, 245]);
});
