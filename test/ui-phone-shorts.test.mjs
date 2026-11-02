import assert from "node:assert/strict";
import test from "node:test";

import {
  getShortPageState,
  shortIndexFromOffset,
  shortPreviewUri,
} from "../src/components/shorts/phone/shortsPagingModel.ts";
import {ShortsQueueLoader} from "../src/hooks/video/shortsQueueLoader.ts";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return {promise, resolve, reject};
}

function page(ids, continuation) {
  return {
    watch_next_feed: ids.map(videoId => ({payload: {videoId}})),
    wn_has_continuation: Boolean(continuation),
    getWatchNextContinuation: continuation,
  };
}

function queueHarness(load, initialId = "a") {
  const states = [];
  const errors = [];
  const queue = new ShortsQueueLoader(
    initialId,
    load,
    state => states.push(state),
    error => errors.push(error),
  );
  return {queue, states, errors};
}

test("short previews keep portrait thumbnails and omit landscape letterboxing", () => {
  assert.equal(
    shortPreviewUri({url: "portrait.jpg", width: 720, height: 1280}),
    "portrait.jpg",
  );
  assert.equal(
    shortPreviewUri({url: "landscape.jpg", width: 1280, height: 720}),
    undefined,
  );
  assert.equal(
    shortPreviewUri({url: "hq2.jpg", width: 480, height: 360}),
    undefined,
  );
  assert.equal(
    shortPreviewUri({url: "square.jpg", width: 480, height: 480}),
    undefined,
  );
});

test("short previews with unknown or invalid dimensions wait for the video", () => {
  assert.equal(shortPreviewUri(undefined), undefined);
  assert.equal(shortPreviewUri({url: "unknown.jpg"}), undefined);
  assert.equal(
    shortPreviewUri({url: "invalid.jpg", width: 0, height: 1280}),
    undefined,
  );
  assert.equal(
    shortPreviewUri({url: "invalid.jpg", width: -720, height: 1280}),
    undefined,
  );
});

test("native paging uses the measured viewport on phones and tablets", () => {
  assert.equal(shortIndexFromOffset(844, 844, 10), 1);
  assert.equal(shortIndexFromOffset(2048, 1024, 10), 2);
  assert.equal(shortIndexFromOffset(200, 844, 10), 0);
  assert.equal(shortIndexFromOffset(700, 844, 10), 1);
  // The same short stays selected when the screen is resized or rotated.
  assert.equal(shortIndexFromOffset(4 * 390, 390, 10), 4);
});

test("bounce and out-of-range offsets stay within the available feed", () => {
  assert.equal(shortIndexFromOffset(-100, 800, 3), 0);
  assert.equal(shortIndexFromOffset(10000, 800, 3), 2);
  assert.equal(shortIndexFromOffset(100, 0, 3), 0);
  assert.equal(shortIndexFromOffset(100, 800, 0), 0);
  assert.equal(shortIndexFromOffset(Number.NaN, 800, 3), 0);
});

test("only the selected page plays and only its next neighbour preloads", () => {
  const states = Array.from({length: 100}, (_, index) =>
    getShortPageState(index, 50, true),
  );
  assert.equal(states.filter(state => state.active).length, 1);
  assert.equal(states.filter(state => state.preload).length, 1);
  assert.equal(states.filter(state => state.nearby).length, 3);
  assert.equal(states[51].preload, true);
  assert.equal(states[49].preload, false);
  assert.equal(getShortPageState(51, 50, false).preload, false);
  assert.deepEqual(getShortPageState(0, 50, true), {
    active: false,
    nearby: false,
    preload: false,
  });
});

test("a fast fling releases the old preparation window", () => {
  const mounted = [49, 50, 51].filter(
    index => getShortPageState(index, 60, false).nearby,
  );
  assert.deepEqual(mounted, []);
  assert.equal(getShortPageState(61, 60, false).preload, false);
});

test("the queue deduplicates ids and respects the final continuation", async () => {
  let continuationCalls = 0;
  const first = page(["a", "b", "b"], async () => {
    continuationCalls++;
    return page(["b", "c"]);
  });
  const {queue, states, errors} = queueHarness(async () => first);
  await queue.fetchMore();
  assert.deepEqual(states.at(-1), {videoIds: ["a", "b"], hasMore: true});
  await queue.fetchMore();
  await queue.fetchMore();
  assert.deepEqual(states.at(-1), {videoIds: ["a", "b", "c"], hasMore: false});
  assert.equal(continuationCalls, 1);
  assert.deepEqual(errors, []);
});

test("concurrent requests load each sequence page once", async () => {
  const initial = deferred();
  const next = deferred();
  let initialCalls = 0;
  let continuationCalls = 0;
  const {queue, states} = queueHarness(() => {
    initialCalls++;
    return initial.promise;
  });
  const pendingInitial = queue.fetchMore();
  await queue.fetchMore();
  initial.resolve(
    page(["b"], () => {
      continuationCalls++;
      return next.promise;
    }),
  );
  await pendingInitial;
  const pendingNext = queue.fetchMore();
  await queue.fetchMore();
  next.resolve(page(["c"]));
  await pendingNext;
  assert.equal(initialCalls, 1);
  assert.equal(continuationCalls, 1);
  assert.deepEqual(states.at(-1).videoIds, ["a", "b", "c"]);
});

test("supports youtubei.js continuations that mutate and return the same page", async () => {
  const sequence = page(["b"], async () => {
    sequence.watch_next_feed = [{payload: {videoId: "c"}}];
    sequence.wn_has_continuation = false;
    return sequence;
  });
  const {queue, states} = queueHarness(async () => sequence);
  await queue.fetchMore();
  await queue.fetchMore();
  assert.deepEqual(states[0], {videoIds: ["a", "b"], hasMore: true});
  assert.deepEqual(states[1], {videoIds: ["a", "b", "c"], hasMore: false});
});

test("duplicate-only pages follow their continuation without stalling", async () => {
  let calls = 0;
  const {queue, states} = queueHarness(async () =>
    page(["a", "a"], async () => {
      calls++;
      return page(["a", "b"]);
    }),
  );
  await queue.fetchMore();
  assert.equal(calls, 1);
  assert.deepEqual(states.at(-1), {videoIds: ["a", "b"], hasMore: false});
});

test("an empty final page stops fetching", async () => {
  let calls = 0;
  const {queue, states} = queueHarness(async () => {
    calls++;
    return page([]);
  });
  await queue.fetchMore();
  await queue.fetchMore();
  assert.equal(calls, 1);
  assert.deepEqual(states.at(-1), {videoIds: ["a"], hasMore: false});
});

test("a late initial result cannot publish after leaving the feed", async () => {
  const initial = deferred();
  const {queue, states} = queueHarness(() => initial.promise);
  const pending = queue.fetchMore();
  queue.dispose();
  initial.resolve(page(["b"]));
  await pending;
  assert.deepEqual(states, []);
});

test("a continuation from an old feed cannot overwrite a new feed", async () => {
  const next = deferred();
  const old = queueHarness(async () => page(["b"], () => next.promise));
  await old.queue.fetchMore();
  const pending = old.queue.fetchMore();
  old.queue.dispose();
  const current = queueHarness(async () => page(["y"]), "x");
  await current.queue.fetchMore();
  next.resolve(page(["c"]));
  await pending;
  assert.equal(old.states.length, 1);
  assert.deepEqual(current.states.at(-1).videoIds, ["x", "y"]);
});

test("request failures stop retries and preserve the playable queue", async () => {
  const failure = new Error("offline");
  const {queue, states, errors} = queueHarness(async () => {
    throw failure;
  });
  await queue.fetchMore();
  await queue.fetchMore();
  assert.deepEqual(states, [{videoIds: ["a"], hasMore: false}]);
  assert.deepEqual(errors, [failure]);
});

test("late errors do not affect a disposed queue", async () => {
  const initial = deferred();
  const {queue, states, errors} = queueHarness(() => initial.promise);
  const pending = queue.fetchMore();
  queue.dispose();
  initial.reject(new Error("offline"));
  await pending;
  assert.deepEqual(states, []);
  assert.deepEqual(errors, []);
});
