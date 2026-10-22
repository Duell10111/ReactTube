import assert from "node:assert/strict";
import test from "node:test";

import {
  getActiveEndscreenElements,
  getCountdownState,
  getEndscreenRecommendations,
  isEndscreenShown,
  resolveNextVideo,
} from "../src/components/video/endcard/endscreenModel.ts";

const tv = {canOpenWebsites: false};
const phone = {canOpenWebsites: true};

function card(id, style, startDuration, endDuration) {
  return {id, style, startDuration, endDuration};
}

test("end cards appear staggered, each within its own window", () => {
  const elements = [
    card("a", "VIDEO", 100, 120),
    card("b", "CHANNEL", 105, 120),
    card("c", "VIDEO", 110, 115),
  ];

  const ids = time =>
    getActiveEndscreenElements(elements, time, tv).map(e => e.id);

  assert.deepEqual(ids(99), []);
  assert.deepEqual(ids(100), ["a"]);
  assert.deepEqual(ids(111), ["a", "b", "c"]);
  assert.deepEqual(ids(115), ["a", "b"]);
  assert.deepEqual(ids(120), []);
});

test("an end card without a usable end stays until the video ends", () => {
  const elements = [card("a", "VIDEO", 10, NaN), card("b", "VIDEO", 10, 5)];

  assert.deepEqual(
    getActiveEndscreenElements(elements, 500, tv).map(e => e.id),
    ["a", "b"],
  );
});

test("an end screen opened early shows every card regardless of timing", () => {
  const elements = [card("a", "VIDEO", 100, 120), card("b", "VIDEO", 110, 120)];

  assert.deepEqual(
    getActiveEndscreenElements(elements, 0, tv, true).map(e => e.id),
    ["a", "b"],
  );
});

test("website cards are left out where no browser can open them", () => {
  const elements = [card("a", "WEBSITE", 0, 10), card("b", "VIDEO", 0, 10)];

  assert.deepEqual(
    getActiveEndscreenElements(elements, 5, tv).map(e => e.id),
    ["b"],
  );
  assert.deepEqual(
    getActiveEndscreenElements(elements, 5, phone).map(e => e.id),
    ["a", "b"],
  );
});

test("the recommendation row lists each supported card once", () => {
  const elements = [
    card("a", "VIDEO"),
    card("w", "WEBSITE"),
    card("a", "VIDEO"),
    card("c", "CHANNEL"),
  ];

  assert.deepEqual(
    getEndscreenRecommendations(elements, tv).map(e => e.id),
    ["a", "c"],
  );
  assert.deepEqual(getEndscreenRecommendations(undefined, tv), []);
});

test("the end cards hand over to the end screen once the video ended", () => {
  const base = {
    currentTime: 110,
    startSeconds: 100,
    ended: false,
    dismissed: false,
    forced: false,
  };

  assert.equal(isEndscreenShown(base), true);
  assert.equal(isEndscreenShown({...base, currentTime: 90}), false);
  assert.equal(isEndscreenShown({...base, ended: true}), false);
  assert.equal(isEndscreenShown({...base, ended: true, forced: true}), false);
  assert.equal(isEndscreenShown({...base, dismissed: true}), false);
  assert.equal(
    isEndscreenShown({...base, currentTime: 0, dismissed: true, forced: true}),
    true,
  );
  assert.equal(isEndscreenShown({...base, startSeconds: undefined}), false);
  assert.equal(isEndscreenShown({...base, startSeconds: NaN}), false);
});

test("the autoplay countdown reports whole seconds and its progress", () => {
  assert.deepEqual(getCountdownState(0, 8), {
    remainingSeconds: 8,
    progress: 0,
    elapsed: false,
  });
  assert.deepEqual(getCountdownState(2100, 8), {
    remainingSeconds: 6,
    progress: 2100 / 8000,
    elapsed: false,
  });
  assert.deepEqual(getCountdownState(9000, 8), {
    remainingSeconds: 0,
    progress: 1,
    elapsed: true,
  });
  assert.deepEqual(getCountdownState(-50, 8).progress, 0);
});

test("the next playlist entry plays before the autoplay suggestion", () => {
  const playlistEndpoint = {payload: {videoId: "p2", playlistId: "PL"}};
  const autoplay = {payload: {videoId: "auto"}};

  assert.deepEqual(
    resolveNextVideo({
      playlist: {
        current_index: 0,
        content: [{id: "p1"}, {id: "p2", navEndpoint: playlistEndpoint}],
      },
      originalData: {autoplay_video_endpoint: autoplay},
    }),
    {videoId: "p2", navEndpoint: playlistEndpoint},
  );
});

test("without a playlist successor the autoplay suggestion plays", () => {
  const autoplay = {payload: {videoId: "auto"}};

  assert.deepEqual(
    resolveNextVideo({
      playlist: {current_index: 1, content: [{id: "p1"}, {id: "p2"}]},
      originalData: {autoplay_video_endpoint: autoplay},
    }),
    {videoId: "auto", navEndpoint: autoplay},
  );
  assert.deepEqual(
    resolveNextVideo({originalData: {autoplay_video_endpoint: null}}),
    {},
  );
});

test("playlist autoplay retains its context across consecutive TV videos", () => {
  const entries = ["p1", "p2", "p3"].map(id => ({
    id,
    navEndpoint: {payload: {videoId: id, params: `params-${id}`}},
  }));

  for (let index = 0; index < 2; index++) {
    const next = resolveNextVideo({
      id: entries[index].id,
      playlist: {id: "PL", current_index: index, content: []},
      watchNextSections: [{parsedData: entries}],
      originalData: {
        autoplay_video_endpoint: {payload: {videoId: "unrelated"}},
      },
    });

    assert.equal(next.videoId, entries[index + 1].id);
    assert.deepEqual(next.watchEndpoint, {
      videoId: entries[index + 1].id,
      params: `params-${entries[index + 1].id}`,
      playlistId: "PL",
      playlistIndex: index + 1,
    });
    assert.equal(entries[index + 1].navEndpoint.payload.playlistId, undefined);
  }
});

test("playlist autoplay works when an entry has no navigation endpoint", () => {
  const next = resolveNextVideo({
    id: "p1",
    playlist: {
      id: "PL",
      current_index: 0,
      content: [{id: "p1"}, {id: "p2"}],
    },
    originalData: {},
  });

  assert.deepEqual(next, {
    videoId: "p2",
    navEndpoint: undefined,
    watchEndpoint: {videoId: "p2", playlistId: "PL", playlistIndex: 1},
  });
});

test("the TV shelf locates the current video independently of the playlist index", () => {
  const payload = {videoId: "p3", playlistId: "PL", index: 12, params: "keep"};
  const next = resolveNextVideo({
    id: "p2",
    playlist: {id: "PL", current_index: 10, content: []},
    watchNextSections: [
      {
        parsedData: [
          {id: "p1"},
          {id: "p2"},
          {id: "p3", navEndpoint: {payload}},
        ],
      },
    ],
    originalData: {},
  });

  assert.equal(next.videoId, "p3");
  assert.deepEqual(next.watchEndpoint, {...payload, playlistIndex: 12});
});

test("autoplay leaving the playlist does not inherit its context", () => {
  const autoplay = {payload: {videoId: "auto"}};
  const next = resolveNextVideo({
    id: "p2",
    playlist: {id: "PL", current_index: 1, content: []},
    watchNextSections: [{parsedData: [{id: "p1"}, {id: "p2"}]}],
    originalData: {autoplay_video_endpoint: autoplay},
  });

  assert.deepEqual(next, {videoId: "auto", navEndpoint: autoplay});
});
