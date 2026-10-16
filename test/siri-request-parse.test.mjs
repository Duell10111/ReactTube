import assert from "node:assert/strict";
import test from "node:test";

import {parseSiriRequest} from "../src/siri/parseSiriRequest.ts";

const base = {
  requestId: "id",
  intent: "play",
  delivery: "handleInApp",
  receivedAt: 0,
  headlessStart: false,
  applicationState: "background",
  connectedScenes: 1,
  mediaType: 0,
  reference: 0,
  genreNames: [],
  moodNames: [],
};

test("parses a spoken title without type as a song and strips the app name", () => {
  // Payload recorded in phase 0: "Spiele Bohemian Rhapsody in ReactTube".
  assert.deepEqual(
    parseSiriRequest({...base, mediaName: "Bohemian Rhapsody in React Tube"}),
    {
      kind: "song",
      query: "Bohemian Rhapsody",
      title: "Bohemian Rhapsody",
      artist: undefined,
    },
  );
});

test("adds the artist to song queries", () => {
  assert.deepEqual(
    parseSiriRequest({
      ...base,
      mediaType: 1,
      mediaName: "Take On Me",
      artistName: "a-ha",
    }),
    {
      kind: "song",
      query: "Take On Me a-ha",
      title: "Take On Me",
      artist: "a-ha",
    },
  );
});

test("parses artists, albums and playlists", () => {
  assert.deepEqual(
    parseSiriRequest({...base, mediaType: 3, artistName: "Queen"}),
    {kind: "artist", query: "Queen", artist: "Queen"},
  );
  assert.deepEqual(
    parseSiriRequest({
      ...base,
      mediaType: 2,
      albumName: "A Night at the Opera",
      artistName: "Queen",
    }),
    {
      kind: "album",
      query: "A Night at the Opera Queen",
      album: "A Night at the Opera",
      artist: "Queen",
    },
  );
  assert.deepEqual(
    parseSiriRequest({...base, mediaType: 5, mediaName: "Sport"}),
    {kind: "playlist", query: "Sport", playlist: "Sport"},
  );
});

test("falls back to the artist when only an artist was understood", () => {
  assert.deepEqual(parseSiriRequest({...base, artistName: "Queen"}), {
    kind: "artist",
    query: "Queen",
    artist: "Queen",
  });
});

test("prefers donated items Siri hands back", () => {
  assert.deepEqual(
    parseSiriRequest({
      ...base,
      mediaName: "Paparazzi",
      itemIdentifier: "rt:video:28jp-30w8Lg",
    }),
    {kind: "donated", videoId: "28jp-30w8Lg"},
  );
});

test("treats requests without anything specific as empty", () => {
  // Payload recorded in phase 0: type .music without a name.
  assert.deepEqual(parseSiriRequest({...base, mediaType: 18}), {
    kind: "empty",
    currentlyPlaying: false,
  });
  assert.deepEqual(parseSiriRequest({...base, reference: 1}), {
    kind: "empty",
    currentlyPlaying: true,
  });
  assert.deepEqual(parseSiriRequest({...base, mediaName: "React Tube"}), {
    kind: "empty",
    currentlyPlaying: false,
  });
});

test("searches genres and moods as songs", () => {
  assert.deepEqual(
    parseSiriRequest({...base, genreNames: ["Jazz"], moodNames: ["relaxing"]}),
    {kind: "song", query: "Jazz relaxing", title: "Jazz relaxing"},
  );
});

test("routes search intents to music or video search", () => {
  assert.deepEqual(
    parseSiriRequest({
      ...base,
      intent: "search",
      mediaName: "Lo-Fi in React Tube",
    }),
    {kind: "search", query: "Lo-Fi", target: "music"},
  );
  assert.deepEqual(
    parseSiriRequest({
      ...base,
      intent: "search",
      mediaType: 14,
      artistName: "Queen",
    }),
    {kind: "search", query: "Queen", target: "video"},
  );
});
