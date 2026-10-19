import assert from "node:assert/strict";
import test from "node:test";

import {playbackClock} from "./helpers/playbackClock.mjs";
import {PlaybackWatchdog} from "../src/utils/PlaybackWatchdog.ts";

function watchdog(options = {}) {
  const clock = playbackClock();
  const failures = [];
  let advances = 0;
  const guard = new PlaybackWatchdog({
    clock,
    onFailure: reason => failures.push(reason),
    onAdvance: () => advances++,
    ...options,
  });
  guard.setActive(true);
  return {guard, clock, failures, advances: () => advances};
}

test("a loaded source reporting the same timestamp still times out", () => {
  const {guard, clock, failures, advances} = watchdog();
  guard.progress(0);
  clock.advance(10_000);
  guard.progress(0);
  clock.advance(10_000);
  assert.deepEqual(failures, ["Playback did not start"]);
  assert.equal(advances(), 0);
});

test("real progress starts playback and a subsequent standstill still triggers recovery", () => {
  const {guard, clock, failures, advances} = watchdog();
  guard.progress(30);
  clock.advance(5_000);
  guard.progress(31);
  clock.advance(19_999);
  assert.equal(failures.length, 0);
  clock.advance(1);
  assert.deepEqual(failures, ["Playback stalled"]);
  assert.equal(advances(), 1);
});

test("pausing or backgrounding stops the watchdog and resuming grants time to buffer", () => {
  const {guard, clock, failures} = watchdog();
  guard.setActive(false);
  clock.advance(100_000);
  assert.equal(failures.length, 0);
  guard.setActive(true);
  clock.advance(19_999);
  assert.equal(failures.length, 0);
  guard.dispose();
  clock.advance(100_000);
  assert.equal(failures.length, 0);
  assert.equal(clock.timers.size, 0);
});

test("a seek jump alone does not establish successful playback", () => {
  const {guard, clock, failures, advances} = watchdog();
  guard.progress(0);
  clock.advance(15_000);
  guard.seek();
  guard.progress(120);
  assert.equal(advances(), 0);
  clock.advance(19_999);
  guard.progress(121);
  assert.equal(advances(), 1);
  assert.equal(failures.length, 0);
});

test("normal end stops monitoring and repeating the video resumes monitoring", () => {
  const {guard, clock, failures} = watchdog();
  guard.progress(10);
  guard.progress(11);
  guard.end();
  guard.progress(11);
  clock.advance(100_000);
  assert.equal(failures.length, 0);
  guard.progress(0);
  guard.progress(1);
  clock.advance(20_000);
  assert.deepEqual(failures, ["Playback stalled"]);
});

test("a repeat that never advances is still monitored", () => {
  const {guard, clock, failures} = watchdog();
  guard.progress(10);
  guard.progress(11);
  guard.end();
  guard.progress(0);
  clock.advance(20_000);
  assert.equal(failures.length, 1);
});

test("native control pauses are respected while buffering remains monitored", () => {
  const {guard, clock, failures} = watchdog();
  guard.progress(0);
  guard.progress(1);
  guard.rateChanged(0);
  clock.advance(100_000);
  assert.equal(failures.length, 0);
  guard.rateChanged(1);
  guard.buffer(true);
  guard.rateChanged(0);
  clock.advance(60_000);
  assert.deepEqual(failures, ["Playback stalled"]);
});

test("a native pause before the first progress is still a pause", () => {
  const {guard, clock, failures} = watchdog();
  guard.rateChanged(0);
  guard.progress(0);
  guard.rateChanged(1);
  guard.rateChanged(0);
  clock.advance(100_000);
  assert.equal(failures.length, 0);
});

test("a rate of 0 before the player ever played does not hide a failed start", () => {
  const {guard, clock, failures} = watchdog();
  guard.rateChanged(0);
  clock.advance(20_000);
  assert.deepEqual(failures, ["Playback did not start"]);
});

test("the app resuming playback supersedes an earlier native pause", () => {
  const {guard, clock, failures} = watchdog();
  guard.progress(0);
  guard.progress(1);
  guard.rateChanged(0);
  guard.setActive(false);
  guard.setActive(true);
  clock.advance(100_000);
  assert.equal(failures.length, 0);
  guard.play();
  clock.advance(20_000);
  assert.deepEqual(failures, ["Playback stalled"]);
});

test("a rebuffer after playback started gets the longer budget", () => {
  const {guard, clock, failures} = watchdog();
  guard.progress(0);
  guard.progress(1);
  clock.advance(5_000);
  guard.buffer(true);
  clock.advance(50_000);
  assert.equal(failures.length, 0);
  guard.buffer(false);
  guard.progress(2);
  clock.advance(19_999);
  assert.equal(failures.length, 0);
  guard.buffer(true);
  clock.advance(60_001);
  assert.deepEqual(failures, ["Playback stalled"]);
});

test("buffering during the initial load keeps the initial deadline", () => {
  const {guard, clock, failures} = watchdog();
  guard.buffer(true);
  clock.advance(10_000);
  guard.buffer(false);
  guard.buffer(true);
  clock.advance(10_000);
  assert.deepEqual(failures, ["Playback did not start"]);
});

test("duplicate errors and late events from a disposed player are ignored", () => {
  const {guard, clock, failures} = watchdog();
  guard.fail();
  guard.fail();
  clock.advance(100_000);
  assert.deepEqual(failures, ["Player error"]);
  guard.dispose();
  guard.progress(1);
  guard.fail();
  assert.equal(failures.length, 1);
});

test("an effect cleanup followed by setup can attach the same watchdog again", () => {
  const {guard, clock, failures} = watchdog();
  guard.dispose();
  guard.attach();
  clock.advance(20_000);
  assert.equal(failures.length, 1);
});
