import assert from "node:assert/strict";
import test from "node:test";

import {
  VLC_SEEK_SETTLE_TIMEOUT_MS,
  buildVlcInitOptions,
  pickVlcFormats,
  settleVlcSeek,
} from "../src/utils/VlcPlayback.ts";

/** Builds a mime type such as `video/webm; codecs="vp9"`. */
const mime = (container, codecs) => `${container}; codecs="${codecs}"`;

const ORIGINAL = {id: "de-DE.4", audio_is_default: true};

function video(itag, height, mime_type, extra = {}) {
  return {
    itag,
    height,
    fps: 60,
    mime_type,
    bitrate: height * 1000,
    has_video: true,
    has_audio: false,
    url: `https://media.test/${itag}`,
    ...extra,
  };
}

function audio(itag, mime_type, bitrate, extra = {}) {
  return {
    itag,
    mime_type,
    bitrate,
    has_audio: true,
    has_video: false,
    audio_track: ORIGINAL,
    url: `https://media.test/${itag}`,
    ...extra,
  };
}

// The adaptive formats of a 2160p60 video as VISIONOS delivers them.
const FORMATS = [
  video(315, 2160, mime("video/webm", "vp9")),
  video(337, 2160, mime("video/webm", "vp9.2")),
  video(701, 2160, mime("video/mp4", "av01.0.13M.10.0.110.09.16.09.0")),
  video(308, 1440, mime("video/webm", "vp9")),
  video(299, 1080, mime("video/mp4", "avc1.64002A")),
  video(303, 1080, mime("video/webm", "vp9")),
  video(298, 720, mime("video/mp4", "avc1.4D4020")),
  audio(140, mime("audio/mp4", "mp4a.40.2"), 130_000),
  audio(251, mime("audio/webm", "opus"), 140_000),
];

test("takes 2160p VP9 and leaves HDR and AV1 out", () => {
  const selection = pickVlcFormats(FORMATS);
  assert.equal(selection?.video.itag, 315);
});

test("understands the vp09 spelling of other clients", () => {
  const formats = [
    video(337, 2160, mime("video/webm", "vp09.02.51.10.01.09.16.09.00")),
    video(315, 2160, mime("video/webm", "vp09.00.51.08")),
  ];
  assert.equal(pickVlcFormats(formats)?.video.itag, 315);
});

test("prefers hardware-decoded avc1 at the same height", () => {
  const selection = pickVlcFormats(FORMATS, {maxHeight: 1080});
  assert.equal(selection?.video.itag, 299);
});

test("prefers the higher frame rate before the codec", () => {
  const formats = [
    video(137, 1080, mime("video/mp4", "avc1.640028"), {fps: 30}),
    video(303, 1080, mime("video/webm", "vp9"), {fps: 60}),
  ];
  assert.equal(pickVlcFormats(formats)?.video.itag, 303);
});

test("skips formats without a URL", () => {
  const formats = [
    video(315, 2160, mime("video/webm", "vp9"), {url: undefined}),
    video(299, 1080, mime("video/mp4", "avc1.64002A")),
  ];
  assert.equal(pickVlcFormats(formats)?.video.itag, 299);
});

test("picks the default audio track as mp4", () => {
  const selection = pickVlcFormats([
    ...FORMATS,
    audio(140, mime("audio/mp4", "mp4a.40.2"), 150_000, {
      audio_track: {id: "en-US.10", audio_is_default: false},
    }),
  ]);
  assert.equal(selection?.audio?.itag, 140);
  assert.equal(selection?.audio?.audio_track?.id, ORIGINAL.id);
});

test("returns nothing without a playable video format", () => {
  assert.equal(
    pickVlcFormats([
      video(701, 2160, mime("video/mp4", "av01.0.13M.10.0.110.09.16.09.0")),
    ]),
    undefined,
  );
});

test("builds the player options", () => {
  assert.deepEqual(
    buildVlcInitOptions({
      audioUrl: "https://media.test/140",
      startSeconds: 12.5,
    }),
    [
      "--network-caching=3000",
      "--input-slave=https://media.test/140",
      "--start-time=12.500",
    ],
  );
  assert.deepEqual(buildVlcInitOptions({startSeconds: 0}), [
    "--network-caching=3000",
  ]);
});

test("settleVlcSeek reports the target while VLC still reports the old time", () => {
  const pending = {targetSeconds: 70, requestedAt: 1000};
  const result = settleVlcSeek(pending, 60.4, 1500);
  assert.equal(result.seconds, 70);
  assert.equal(result.pending, pending);
});

test("settleVlcSeek hands back to VLC once it arrives at the target", () => {
  const result = settleVlcSeek(
    {targetSeconds: 70, requestedAt: 1000},
    70.6,
    2500,
  );
  assert.equal(result.seconds, 70.6);
  assert.equal(result.pending, undefined);
});

test("settleVlcSeek gives up on a seek VLC never finishes", () => {
  const result = settleVlcSeek(
    {targetSeconds: 70, requestedAt: 1000},
    62,
    1000 + VLC_SEEK_SETTLE_TIMEOUT_MS,
  );
  assert.equal(result.seconds, 62);
  assert.equal(result.pending, undefined);
});

test("settleVlcSeek passes the reported time through without a seek", () => {
  assert.deepEqual(settleVlcSeek(undefined, 12, 0), {seconds: 12});
});
