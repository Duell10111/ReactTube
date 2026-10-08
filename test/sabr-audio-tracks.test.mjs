import assert from "node:assert/strict";
import test from "node:test";

import {pickSabrAudioFormats} from "../src/utils/sabrAudioTracks.ts";

const MP4 = "audio/mp4; codecs=mp4a.40.2";
const MP4_LOW = "audio/mp4; codecs=mp4a.40.5";
const OPUS = "audio/webm; codecs=opus";

function audio(itag, mime_type, bitrate, track, extra = {}) {
  return {
    itag,
    mime_type,
    bitrate,
    has_audio: true,
    has_video: false,
    audio_track: track,
    ...extra,
  };
}

const ENGLISH_DUB = {id: "en-US.10", audio_is_default: false};
const GERMAN_ORIGINAL = {id: "de-DE.4", audio_is_default: true};

test("prefers the original track over a slightly larger auto-dub", () => {
  // Shape of ZX_XMiXZHXo: the English auto-dub out-bits the German original.
  const formats = [
    audio(139, MP4_LOW, 50098, ENGLISH_DUB),
    audio(139, MP4_LOW, 50093, GERMAN_ORIGINAL, {is_original: true}),
    audio(140, MP4, 130671, ENGLISH_DUB),
    audio(140, MP4, 130566, GERMAN_ORIGINAL, {is_original: true}),
    audio(251, OPUS, 136824, GERMAN_ORIGINAL, {is_original: true}),
  ];

  const picked = pickSabrAudioFormats(formats);

  assert.deepEqual(
    picked.map(f => [f.itag, f.audio_track.id]),
    [
      [140, "de-DE.4"],
      [140, "en-US.10"],
    ],
  );
});

test("falls back to the original flag without a default track", () => {
  const formats = [
    audio(140, MP4, 200, {id: "en.1"}),
    audio(140, MP4, 100, {id: "fr.2"}, {is_original: true}),
  ];

  assert.equal(pickSabrAudioFormats(formats)[0].audio_track.id, "fr.2");
});

test("prefers a non-DRC format within one track", () => {
  const formats = [
    audio(140, MP4, 140, GERMAN_ORIGINAL, {is_drc: true}),
    audio(140, MP4, 130, GERMAN_ORIGINAL),
  ];

  const picked = pickSabrAudioFormats(formats);

  assert.equal(picked.length, 1);
  assert.equal(picked[0].is_drc, undefined);
});

test("keeps the highest bitrate for a video with a single unnamed track", () => {
  const formats = [
    audio(139, MP4_LOW, 50, undefined),
    audio(140, MP4, 130, undefined),
    {itag: 137, mime_type: "video/mp4; codecs=avc1", has_video: true},
  ];

  assert.deepEqual(
    pickSabrAudioFormats(formats).map(f => f.itag),
    [140],
  );
});

test("returns nothing without mp4 audio", () => {
  assert.deepEqual(
    pickSabrAudioFormats([audio(251, OPUS, 136, GERMAN_ORIGINAL)]),
    [],
  );
});
