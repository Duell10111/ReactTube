import assert from "node:assert/strict";
import test from "node:test";

import {deferredPlayback, flushPlayback} from "./helpers/playbackClock.mjs";
import {createAutomaticVideoPreparer} from "../src/utils/AutomaticVideoSource.ts";

function source(overrides = {}) {
  return {
    client: "VISIONOS",
    satisfied: "primary",
    info: {
      streaming_data: {
        hls_manifest_url: "https://example.test/master.m3u8",
        formats: [{has_video: true, has_audio: true}],
      },
    },
    hasHlsManifest: true,
    canGenerateHls: true,
    canUseSabr: true,
    ...overrides,
  };
}

function preparer(overrides = {}) {
  const requests = [];
  const generated = [];
  const prepare = createAutomaticVideoPreparer({
    resolve: async mode => {
      requests.push(mode);
      return source();
    },
    generate: async (_source, av1) => {
      generated.push(av1);
      return {uri: `data:${av1 ? "av1" : "avc1"}`};
    },
    sabr: async () => ({
      masterUri: "http://127.0.0.1/master.m3u8",
      stop: async () => {},
    }),
    progressive: async () => "https://example.test/file.mp4",
    ...overrides,
  });
  return {
    prepare,
    requests,
    generated,
    signal: new globalThis.AbortController().signal,
  };
}

test("resolves HLS first without eagerly building any manifests or SABR resources", async () => {
  let sabr = 0;
  const {prepare, requests, generated, signal} = preparer({
    sabr: async () => {
      sabr++;
    },
  });
  const resolved = await prepare("hls", signal);
  assert.equal(resolved.kind, "youtube-hls");
  assert.deepEqual(requests, ["youtube-hls"]);
  assert.deepEqual(generated, []);
  assert.equal(sabr, 0);
});

test("reuses capable player data and treats AVC and AV1 as separate preparations", async () => {
  const {prepare, requests, generated, signal} = preparer();
  await prepare("hls", signal);
  const avc = await prepare("hlsLocal", signal);
  const av1 = await prepare("hlsLocalAv1", signal);
  assert.deepEqual(requests, ["youtube-hls"]);
  assert.deepEqual(generated, [false, true]);
  assert.notEqual(avc.uri, av1.uri);
});

test("fetches the right profile when cached streaming data cannot build a manifest", async () => {
  const requests = [];
  const {prepare, signal} = preparer({
    resolve: async mode => {
      requests.push(mode);
      return source({canGenerateHls: mode === "generated"});
    },
  });
  await prepare("hls", signal);
  assert.equal((await prepare("hlsLocal", signal)).kind, "generated-hls");
  assert.deepEqual(requests, ["youtube-hls", "generated"]);
});

test("authenticated responses use local HLS and never trigger more anonymous or SABR requests", async () => {
  let requests = 0;
  let sabr = 0;
  const {prepare, signal} = preparer({
    resolve: async () => {
      requests++;
      return source({
        authenticated: true,
        hasHlsManifest: false,
        canUseSabr: false,
      });
    },
    sabr: async () => {
      sabr++;
    },
  });
  assert.equal(await prepare("hls", signal), undefined);
  assert.equal((await prepare("hlsLocal", signal)).kind, "generated-hls");
  assert.equal(await prepare("sabr", signal), undefined);
  assert.equal(requests, 1);
  assert.equal(sabr, 0);
});

test("progressive playback skips audio-only responses", async () => {
  let progressive = 0;
  const {prepare, signal} = preparer({
    resolve: async () =>
      source({
        info: {
          streaming_data: {formats: [{has_audio: true, has_video: false}]},
        },
      }),
    progressive: async () => {
      progressive++;
    },
  });
  assert.equal(await prepare("http", signal), undefined);
  assert.equal(progressive, 0);
});

test("a late generated manifest is disposed if its attempt was abandoned", async () => {
  const slow = deferredPlayback();
  let released = 0;
  const abort = new globalThis.AbortController();
  const {prepare} = preparer({generate: () => slow.promise});
  const preparing = prepare("hlsLocal", abort.signal);
  await flushPlayback();
  abort.abort();
  slow.resolve({
    uri: "data:late",
    dispose: () => {
      released++;
    },
  });
  assert.equal(await preparing, undefined);
  assert.equal(released, 1);
});

test("a late SABR source is closed if its attempt was abandoned", async () => {
  const slow = deferredPlayback();
  let stopped = 0;
  const abort = new globalThis.AbortController();
  const {prepare} = preparer({sabr: () => slow.promise});
  const preparing = prepare("sabr", abort.signal);
  await flushPlayback();
  abort.abort();
  slow.resolve({
    masterUri: "http://127.0.0.1/late",
    stop: async () => {
      stopped++;
    },
  });
  assert.equal(await preparing, undefined);
  assert.equal(stopped, 1);
});

test("aborted player responses are not cached for later attempts", async () => {
  const slow = deferredPlayback();
  let requests = 0;
  const {prepare} = preparer({
    resolve: async () => {
      requests++;
      return slow.promise;
    },
  });
  const abort = new globalThis.AbortController();
  const pending = prepare("hls", abort.signal);
  abort.abort();
  slow.resolve(source());
  assert.equal(await pending, undefined);
  await prepare("hlsLocal", new globalThis.AbortController().signal);
  assert.equal(requests, 2);
});
