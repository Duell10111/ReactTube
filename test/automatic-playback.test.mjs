import assert from "node:assert/strict";
import test from "node:test";

import {
  playbackClock,
  flushPlayback,
  deferredPlayback,
} from "./helpers/playbackClock.mjs";
import {
  AutomaticPlaybackSession,
  automaticPlaybackOrder,
  PlaybackAccessError,
} from "../src/utils/AutomaticPlayback.ts";

function session(t, options = {}) {
  const clock = playbackClock();
  const states = [];
  const attempts = [];
  const controller = new AutomaticPlaybackSession({
    order: ["hls", "hlsLocal", "hlsLocalAv1", "sabr", "http"],
    prepare: async (type, signal) => {
      attempts.push({type, signal});
      return {uri: `https://example.test/${type}`};
    },
    ...options,
    clock,
    onChange: state => states.push(state),
  });
  t.after(() => controller.dispose());
  controller.start();
  return {controller, clock, states, attempts};
}

test("orders every supported type and skips unknown AV1 and unavailable SABR", () => {
  assert.deepEqual(
    automaticPlaybackOrder({generatedHls: true, av1: true, sabr: true}),
    ["hls", "hlsLocal", "hlsLocalAv1", "sabr", "http"],
  );
  assert.deepEqual(
    automaticPlaybackOrder({generatedHls: true, av1: false, sabr: false}),
    ["hls", "hlsLocal", "http"],
  );
  assert.deepEqual(
    automaticPlaybackOrder({generatedHls: false, av1: true, sabr: false}),
    ["hls", "http"],
  );
});

test("continues after missing data and preparation errors, then waits for real playback", async t => {
  const attempts = [];
  const {controller} = session(t, {
    prepare: async type => {
      attempts.push(type);
      if (type === "hls") return undefined;
      if (type === "hlsLocal") throw new Error("manifest failed");
      return {uri: "https://example.test/av1"};
    },
  });
  await flushPlayback();
  assert.deepEqual(attempts, ["hls", "hlsLocal", "hlsLocalAv1"]);
  assert.equal(controller.state.phase, "starting");
  controller.progress(controller.state.attemptId);
  assert.equal(controller.state.phase, "playing");
});

test("duplicate errors and stale progress cannot skip or activate a newer attempt", async t => {
  const {controller, attempts} = session(t);
  await flushPlayback();
  const oldId = controller.state.attemptId;
  controller.fail(oldId);
  controller.fail(oldId);
  controller.progress(oldId);
  controller.setActive(oldId, true);
  await flushPlayback();
  assert.equal(controller.state.type, "hlsLocal");
  assert.equal(controller.state.phase, "starting");
  assert.deepEqual(
    attempts.map(a => a.type),
    ["hls", "hlsLocal"],
  );
});

test("times out preparation, aborts it, and releases a late resource without publishing it", async t => {
  const slow = deferredPlayback();
  let disposed = 0;
  let signal;
  const {controller, clock, states} = session(t, {
    prepare: async (type, currentSignal) => {
      if (type === "hls") {
        signal = currentSignal;
        return slow.promise;
      }
      return {uri: "https://example.test/next"};
    },
  });
  await flushPlayback();
  clock.advance(20_000);
  await flushPlayback();
  assert.equal(signal.aborted, true);
  assert.equal(controller.state.type, "hlsLocal");
  slow.resolve({
    uri: "https://example.test/late",
    dispose: () => {
      disposed++;
    },
  });
  await flushPlayback();
  assert.equal(disposed, 1);
  assert.ok(!states.some(state => state.source?.uri.endsWith("late")));
});

test("a disposed chain aborts pending work and cannot affect a fresh video or retry", async t => {
  const slow = deferredPlayback();
  let disposed = 0;
  const old = session(t, {prepare: () => slow.promise});
  await flushPlayback();
  old.controller.dispose();
  const fresh = session(t);
  await flushPlayback();
  slow.resolve({
    uri: "https://example.test/old-video",
    dispose: () => {
      disposed++;
    },
  });
  await flushPlayback();
  old.controller.fail(1);
  assert.equal(old.controller.state.phase, "disposed");
  assert.equal(old.clock.timers.size, 0);
  assert.equal(disposed, 1);
  assert.equal(fresh.controller.state.type, "hls");
});

test("pauses the startup budget while a mounted player is paused or not yet mounted", async t => {
  const {controller, clock} = session(t, {budgetMs: 100});
  await flushPlayback();
  clock.advance(1_000);
  assert.equal(controller.state.phase, "starting");
  const id = controller.state.attemptId;
  controller.setActive(id, true);
  clock.advance(40);
  controller.setActive(id, false);
  clock.advance(1_000);
  controller.setActive(id, true);
  clock.advance(59);
  assert.equal(controller.state.phase, "starting");
  clock.advance(1);
  assert.equal(controller.state.phase, "failed");
  assert.equal(controller.state.reason, "budget");
});

test("the total budget includes time spent preparing and starting across attempts", async t => {
  const first = deferredPlayback();
  const next = deferredPlayback();
  const {controller, clock} = session(t, {
    budgetMs: 100,
    prepare: type => (type === "hls" ? first.promise : next.promise),
  });
  await flushPlayback();
  clock.advance(30);
  first.resolve({uri: "https://example.test/first"});
  await flushPlayback();
  controller.setActive(controller.state.attemptId, true);
  clock.advance(40);
  controller.fail(controller.state.attemptId);
  await flushPlayback();
  clock.advance(30);
  assert.equal(controller.state.phase, "failed");
  assert.equal(controller.state.reason, "budget");
  assert.equal(clock.timers.size, 0);
});

test("successful playback clears startup timers and later failure tries only remaining types", async t => {
  const {controller, clock, attempts} = session(t, {budgetMs: 100});
  await flushPlayback();
  controller.setActive(controller.state.attemptId, true);
  clock.advance(90);
  controller.progress(controller.state.attemptId);
  clock.advance(10_000);
  assert.equal(controller.state.phase, "playing");
  assert.equal(clock.timers.size, 0);
  controller.fail(controller.state.attemptId);
  await flushPlayback();
  controller.setActive(controller.state.attemptId, true);
  clock.advance(90);
  assert.equal(controller.state.type, "hlsLocal");
  assert.equal(controller.state.phase, "starting");
  assert.deepEqual(
    attempts.map(a => a.type),
    ["hls", "hlsLocal"],
  );
});

test("exhaustion emits one final failure and releases every prepared source", async t => {
  const released = [];
  const {controller, states, clock} = session(t, {
    prepare: async type => ({
      uri: `https://example.test/${type}`,
      dispose: () => released.push(type),
    }),
  });
  for (let index = 0; index < 5; index++) {
    await flushPlayback();
    controller.fail(controller.state.attemptId);
  }
  await flushPlayback();
  controller.fail(controller.state.attemptId);
  assert.equal(controller.state.phase, "failed");
  assert.equal(states.filter(state => state.phase === "failed").length, 1);
  assert.deepEqual(released, [
    "hls",
    "hlsLocal",
    "hlsLocalAv1",
    "sabr",
    "http",
  ]);
  assert.equal(clock.timers.size, 0);
});

test("definitive access denial ends the chain without trying more anonymous profiles", async t => {
  const attempts = [];
  const {controller} = session(t, {
    prepare: async type => {
      attempts.push(type);
      throw new PlaybackAccessError("private");
    },
  });
  await flushPlayback();
  assert.equal(controller.state.phase, "failed");
  assert.equal(controller.state.reason, "access");
  assert.deepEqual(attempts, ["hls"]);
});

test("cleanup errors do not prevent trying the next source", async t => {
  const {controller} = session(t, {
    prepare: async type => ({
      uri: `https://example.test/${type}`,
      dispose: () => {
        throw new Error("cleanup");
      },
    }),
  });
  await flushPlayback();
  controller.fail(controller.state.attemptId);
  await flushPlayback();
  assert.equal(controller.state.type, "hlsLocal");
});

test("duplicate URLs are skipped while a distinct AV1 configuration can still be tried", async t => {
  const {controller} = session(t, {
    prepare: async () => ({uri: "https://example.test/shared"}),
  });
  await flushPlayback();
  controller.fail(controller.state.attemptId);
  await flushPlayback();
  assert.equal(controller.state.type, "hlsLocalAv1");
  controller.fail(controller.state.attemptId);
  await flushPlayback();
  assert.equal(controller.state.phase, "failed");
});

test("immediate disposal never starts preparation", async t => {
  const {controller, attempts, clock} = session(t);
  controller.dispose();
  await flushPlayback();
  assert.equal(attempts.length, 0);
  assert.equal(clock.timers.size, 0);
});
