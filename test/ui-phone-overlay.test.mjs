import assert from "node:assert/strict";
import test from "node:test";

import {
  DOUBLE_TAP_SEEK_SECONDS,
  DOUBLE_TAP_WINDOW_MS,
  SEEK_CHAIN_WINDOW_MS,
  formatPlaybackTime,
  getChainSeekTarget,
  getProgressFraction,
  getTapZone,
  getTimeForBarPosition,
  initialTapState,
  interpretTap,
} from "../src/components/video/phone/phoneOverlayGestures.ts";

const WIDTH = 400;
const LEFT = 40;
const CENTER = 200;
const RIGHT = 360;

function feed(taps) {
  let state = initialTapState;
  return taps.map(([x, at]) => {
    const next = interpretTap(state, {x, width: WIDTH, at});
    state = next.state;
    return next.result;
  });
}

test("the player splits into a seek zone on each side and a free middle", () => {
  assert.equal(getTapZone(LEFT, WIDTH), "left");
  assert.equal(getTapZone(CENTER, WIDTH), "center");
  assert.equal(getTapZone(RIGHT, WIDTH), "right");
  // Before the first layout there is no width to split.
  assert.equal(getTapZone(10, 0), "center");
});

test("a lone tap is a single tap", () => {
  assert.deepEqual(feed([[RIGHT, 1000]]), [{kind: "single"}]);
});

test("a double tap on the right jumps forward ten seconds", () => {
  assert.deepEqual(
    feed([
      [RIGHT, 1000],
      [RIGHT, 1000 + DOUBLE_TAP_WINDOW_MS - 50],
    ]),
    [
      {kind: "single"},
      {
        kind: "seek",
        direction: 1,
        totalSeconds: DOUBLE_TAP_SEEK_SECONDS,
        started: true,
      },
    ],
  );
});

test("a double tap on the left jumps back", () => {
  const results = feed([
    [LEFT, 1000],
    [LEFT, 1200],
  ]);
  assert.equal(results[1].kind, "seek");
  assert.equal(results[1].direction, -1);
});

test("taps further apart than the window stay two single taps", () => {
  assert.deepEqual(
    feed([
      [RIGHT, 1000],
      [RIGHT, 1000 + DOUBLE_TAP_WINDOW_MS + 1],
    ]),
    [{kind: "single"}, {kind: "single"}],
  );
});

test("a double tap in the middle does not seek", () => {
  assert.deepEqual(
    feed([
      [CENTER, 1000],
      [CENTER, 1100],
    ]),
    [{kind: "single"}, {kind: "single"}],
  );
});

test("two taps on different sides are no double tap", () => {
  assert.deepEqual(
    feed([
      [LEFT, 1000],
      [RIGHT, 1100],
    ]),
    [{kind: "single"}, {kind: "single"}],
  );
});

test("every further tap of a chain adds ten seconds", () => {
  const results = feed([
    [RIGHT, 1000],
    [RIGHT, 1200],
    [RIGHT, 1200 + SEEK_CHAIN_WINDOW_MS - 10],
    [RIGHT, 1200 + 2 * SEEK_CHAIN_WINDOW_MS - 20],
  ]);
  assert.deepEqual(
    results.slice(1).map(r => [r.totalSeconds, r.started]),
    [
      [10, true],
      [20, false],
      [30, false],
    ],
  );
});

test("a chain ends once the taps stop", () => {
  const results = feed([
    [RIGHT, 1000],
    [RIGHT, 1200],
    [RIGHT, 1200 + SEEK_CHAIN_WINDOW_MS + 1],
  ]);
  assert.deepEqual(results[2], {kind: "single"});
});

test("tapping the other side mid-chain turns the chain around", () => {
  const results = feed([
    [RIGHT, 1000],
    [RIGHT, 1200],
    [LEFT, 1400],
  ]);
  assert.deepEqual(results[2], {
    kind: "seek",
    direction: -1,
    totalSeconds: DOUBLE_TAP_SEEK_SECONDS,
    started: true,
  });
});

test("a chain target is measured from the position at its first tap", () => {
  assert.equal(getChainSeekTarget(100, 1, 30, 600), 130);
  assert.equal(getChainSeekTarget(100, -1, 20, 600), 80);
});

test("a chain target stays inside the video", () => {
  assert.equal(getChainSeekTarget(5, -1, 10, 600), 0);
  // One second before the end, so the jump does not finish the video.
  assert.equal(getChainSeekTarget(595, 1, 10, 600), 599);
  // Unknown duration: nothing to clamp against yet.
  assert.equal(getChainSeekTarget(5, 1, 10, 0), 15);
});

test("the seek bar maps touches to times and clamps them", () => {
  assert.equal(getTimeForBarPosition(100, 400, 600), 150);
  assert.equal(getTimeForBarPosition(-20, 400, 600), 0);
  assert.equal(getTimeForBarPosition(500, 400, 600), 600);
  assert.equal(getTimeForBarPosition(100, 0, 600), 0);
});

test("progress is a fraction that survives a missing duration", () => {
  assert.equal(getProgressFraction(30, 120), 0.25);
  assert.equal(getProgressFraction(30, 0), 0);
  assert.equal(getProgressFraction(200, 120), 1);
});

test("times are written the way YouTube writes them", () => {
  assert.equal(formatPlaybackTime(0), "0:00");
  assert.equal(formatPlaybackTime(65.9), "1:05");
  assert.equal(formatPlaybackTime(3723), "1:02:03");
  // A long video shows hours from the start, so the label does not jump.
  assert.equal(formatPlaybackTime(65, 4000), "0:01:05");
  assert.equal(formatPlaybackTime(Number.NaN), "0:00");
});
