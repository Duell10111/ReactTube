import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPlaybackLadder,
  describeSourceKind,
  sameLadder,
} from "../src/utils/PlaybackLadder.ts";

const ALL_SOURCES = {
  sabrHlsUrl: "data:application/vnd.apple.mpegurl,sabr",
  generatedHlsUrl: "data:application/vnd.apple.mpegurl,generated",
  youtubeHlsUrl: "https://manifest.googlevideo.test/master.m3u8",
  progressiveUrl: "https://media.googlevideo.test/videoplayback",
};

const kinds = ladder => ladder.map(step => step.kind);

test("puts the chosen mode first and keeps the rest as a safety net", () => {
  assert.deepEqual(kinds(buildPlaybackLadder(ALL_SOURCES, "sabr")), [
    "sabr-hls",
    "generated-hls",
    "youtube-hls",
    "progressive",
  ]);

  assert.deepEqual(kinds(buildPlaybackLadder(ALL_SOURCES, "generated")), [
    "generated-hls",
    "youtube-hls",
    "progressive",
  ]);
});

test("SABR mode without a segment server drops through to the generated manifest", () => {
  // This is the phase 6.6 fallback: no local server means no SABR URL was built,
  // so the ladder starts one step lower without anything having to fail first.
  const {sabrHlsUrl: _unused, ...withoutSabr} = ALL_SOURCES;

  assert.deepEqual(kinds(buildPlaybackLadder(withoutSabr, "sabr")), [
    "generated-hls",
    "youtube-hls",
    "progressive",
  ]);
});

test("SABR mode falls all the way to YouTube's manifest when nothing else is there", () => {
  assert.deepEqual(
    kinds(buildPlaybackLadder({youtubeHlsUrl: ALL_SOURCES.youtubeHlsUrl}, "sabr")),
    ["youtube-hls"],
  );
});

test("names the SABR step", () => {
  assert.equal(describeSourceKind("sabr-hls"), "SABR");
});

test("collapses steps that point at the same URL", () => {
  const shared = "https://manifest.googlevideo.test/master.m3u8";

  const ladder = buildPlaybackLadder(
    {sabrHlsUrl: shared, youtubeHlsUrl: shared},
    "sabr",
  );

  assert.deepEqual(kinds(ladder), ["sabr-hls"]);
});

test("recognises an unchanged ladder", () => {
  const a = buildPlaybackLadder(ALL_SOURCES, "sabr");
  const b = buildPlaybackLadder(ALL_SOURCES, "sabr");

  assert.ok(sameLadder(a, b));
  assert.ok(!sameLadder(a, buildPlaybackLadder(ALL_SOURCES, "generated")));
});
