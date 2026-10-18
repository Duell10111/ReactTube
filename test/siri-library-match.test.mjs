import assert from "node:assert/strict";
import test from "node:test";

import {matchSiriLibrary} from "../src/siri/matchSiriLibrary.ts";

const library = {
  playlists: [
    {id: "PLsport", title: "Sport", source: "account"},
    {id: "LC-sport", title: "Sport", source: "local"},
    {id: "LC-chill", title: "Chill Abend", source: "local"},
  ],
  downloads: [
    {
      videoId: "fJ9rUzIMcZQ",
      title: "Bohemian Rhapsody (Remastered 2011)",
      artist: "Queen",
    },
    {videoId: "cover", title: "Bohemian Rhapsody", artist: "Cover Band"},
    {videoId: "djV11Xbc914", title: "Take On Me", artist: "a-ha"},
  ],
};

test("prefers the local playlist when names collide", () => {
  assert.deepEqual(
    matchSiriLibrary(
      {kind: "playlist", query: "Sport", playlist: "Sport"},
      library,
    ),
    {kind: "playlist", playlist: library.playlists[1]},
  );
});

test("ignores filler words Siri leaves in playlist names", () => {
  assert.equal(
    matchSiriLibrary(
      {
        kind: "playlist",
        query: "meine Playlist chill abend",
        playlist: "meine Playlist chill abend",
      },
      library,
    )?.playlist?.id,
    "LC-chill",
  );
});

test("matches a playlist name reported as a song", () => {
  assert.equal(
    matchSiriLibrary(
      {kind: "song", query: "Chill Abend", title: "Chill Abend"},
      library,
    )?.playlist?.id,
    "LC-chill",
  );
});

test("prefers the download with the matching artist", () => {
  assert.equal(
    matchSiriLibrary(
      {
        kind: "song",
        query: "Bohemian Rhapsody Queen",
        title: "Bohemian Rhapsody",
        artist: "Queen",
      },
      library,
    )?.download?.videoId,
    "fJ9rUzIMcZQ",
  );
});

test("does not use a download of another artist", () => {
  assert.equal(
    matchSiriLibrary(
      {
        kind: "song",
        query: "Take on me Weezer",
        title: "Take on me",
        artist: "Weezer",
      },
      library,
    ),
    undefined,
  );
});

test("does not use a download that only shares words with the request", () => {
  assert.equal(
    matchSiriLibrary({kind: "song", query: "Take", title: "Take"}, library),
    undefined,
  );
});

test("leaves artists, albums and empty requests to the YouTube search", () => {
  assert.equal(
    matchSiriLibrary(
      {kind: "artist", query: "Queen", artist: "Queen"},
      library,
    ),
    undefined,
  );
  assert.equal(
    matchSiriLibrary({kind: "empty", currentlyPlaying: false}, library),
    undefined,
  );
});

test("matches playlist names with swapped words", () => {
  assert.equal(
    matchSiriLibrary(
      {kind: "playlist", query: "Today Hardstyle", playlist: "Today Hardstyle"},
      {
        playlists: [
          {id: "VLPLhard", title: "hardstyle today", source: "account"},
        ],
        downloads: [],
      },
    )?.playlist?.id,
    "VLPLhard",
  );
});

test("matches playlist names without the possessive Siri drops", () => {
  const playlists = [
    {id: "PLhard", title: "Today's Hardstyle", source: "account"},
  ];
  for (const spoken of [
    "Today Hardstyle",
    "Hardstyle Today",
    "Todays Hardstyle",
  ]) {
    assert.equal(
      matchSiriLibrary(
        {kind: "playlist", query: spoken, playlist: spoken},
        {playlists, downloads: []},
      )?.playlist?.id,
      "PLhard",
      spoken,
    );
  }
});

test("matches a playlist when Siri adds misheard words", () => {
  const playlists = [
    {id: "PLhard", title: "Today's Hardstyle", source: "account"},
    {id: "PLhits", title: "Hits", source: "account"},
  ];
  assert.equal(
    matchSiriLibrary(
      {kind: "playlist", query: "x", playlist: "Today's Hits Hardstyle Inacio"},
      {playlists, downloads: []},
    )?.playlist?.id,
    "PLhard",
  );
  // A one-word title needs an exact match.
  assert.equal(
    matchSiriLibrary(
      {kind: "playlist", query: "x", playlist: "Today's Hits"},
      {playlists, downloads: []},
    ),
    undefined,
  );
});
