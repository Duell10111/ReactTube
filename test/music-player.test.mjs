import assert from "node:assert/strict";
import test from "node:test";

import {AUDIO_PLAYBACK_RESOLVER_PROFILE} from "../src/utils/PlaybackClientProfiles.ts";
import {audioSourceToMediaItem} from "../src/utils/music/MediaItemAdapter.ts";
import {
  getNextPlaylistItem,
  getPreviousPlaylistItem,
  shouldRepeatCurrent,
  shufflePlaylistAfterCurrent,
} from "../src/utils/music/PlaylistPlayback.ts";

const track = {
  id: "track-1",
  title: "A track",
  author: {id: "artist-1", name: "An artist"},
  thumbnailImage: {
    url: "https://example.test/cover.jpg",
    width: 512,
    height: 512,
  },
  durationSeconds: 321,
};

test("maps a resolved direct source to an RNTP MediaItem", () => {
  const expires = new Date("2030-01-01T00:00:00.000Z");
  const item = audioSourceToMediaItem(track, {
    kind: "direct",
    url: "https://example.test/audio.m4a",
    mimeType: "audio/mp4",
    client: "VISIONOS",
    expires,
    formatItag: 140,
  });

  assert.deepEqual(item, {
    mediaId: "track-1",
    url: "https://example.test/audio.m4a",
    title: "A track",
    artist: "An artist",
    artworkUrl: "https://example.test/cover.jpg",
    duration: 321,
    endPosition: 321,
    mimeType: "audio/mp4",
    extras: {
      sourceKind: "direct",
      client: "VISIONOS",
      expiresAt: expires.getTime(),
      formatItag: 140,
    },
  });
});

test("does not clip the YouTube HLS fallback to metadata duration", () => {
  const item = audioSourceToMediaItem(track, {
    kind: "youtube-hls",
    url: "https://example.test/audio.m3u8",
    mimeType: "application/x-mpegURL",
  });

  assert.equal(item.endPosition, undefined);
  assert.equal(item.extras.sourceKind, "youtube-hls");
});

test("selects previous, next and repeat-all playlist items", () => {
  const items = [{id: "a"}, {id: "b"}, {id: "c"}];

  assert.equal(getPreviousPlaylistItem(items, "b")?.id, "a");
  assert.equal(getPreviousPlaylistItem(items, "a"), undefined);
  assert.equal(getNextPlaylistItem(items, "b", undefined)?.id, "c");
  assert.equal(getNextPlaylistItem(items, "c", undefined), undefined);
  assert.equal(getNextPlaylistItem(items, "c", "RepeatAll")?.id, "a");
  assert.equal(getNextPlaylistItem(items, "missing", "RepeatAll"), undefined);
  assert.equal(shouldRepeatCurrent("RepeatOne"), true);
  assert.equal(shouldRepeatCurrent("RepeatAll"), false);
});

test("shuffle preserves history and only rearranges up-next", () => {
  const items = [{id: "a"}, {id: "b"}, {id: "c"}, {id: "d"}];
  const result = shufflePlaylistAfterCurrent(items, "b", tail =>
    [...tail].reverse(),
  );

  assert.deepEqual(
    result.map(item => item.id),
    ["a", "b", "d", "c"],
  );
  assert.deepEqual(
    items.map(item => item.id),
    ["a", "b", "c", "d"],
  );
});

test("audio resolver stays anonymous and has a client fallback ladder", () => {
  const clients = new Set([
    ...AUDIO_PLAYBACK_RESOLVER_PROFILE.clients,
    ...AUDIO_PLAYBACK_RESOLVER_PROFILE.clientsFallback,
  ]);

  assert.equal(AUDIO_PLAYBACK_RESOLVER_PROFILE.profile, "audio");
  assert.equal(AUDIO_PLAYBACK_RESOLVER_PROFILE.skipAuth, true);
  assert.equal(AUDIO_PLAYBACK_RESOLVER_PROFILE.clients[0], "VISIONOS");
  assert.ok(clients.size > 1, "audio resolution must not use one fixed client");
  assert.ok(AUDIO_PLAYBACK_RESOLVER_PROFILE.clientsFallback.length > 1);
});
