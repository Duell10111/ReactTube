import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeForMatch,
  rankSiriSearchResults,
} from "../src/siri/rankSiriSearchResults.ts";

const song = (title, ...artists) => ({title, artists, type: "song"});

test("normalizes accents, brackets, features and dash suffixes", () => {
  assert.equal(
    normalizeForMatch("Café del Mar (Remastered 2011)"),
    "cafe del mar",
  );
  assert.equal(normalizeForMatch("Paparazzi feat. Someone"), "paparazzi");
  assert.equal(normalizeForMatch("Take On Me - 2015 Remaster"), "take on me");
  assert.equal(normalizeForMatch("Rock & Roll"), "rock and roll");
});

test("keeps YouTube's order when the first result already fits", () => {
  const candidates = [
    song("Bohemian Rhapsody", "Queen"),
    song("Bohemian Rhapsody", "Some Cover Band"),
  ];
  assert.equal(
    rankSiriSearchResults({title: "Bohemian Rhapsody"}, candidates),
    0,
  );
});

test("skips results that do not contain the title", () => {
  // Phase 0: "Take On Me in React Tube" returned this as the first result.
  const candidates = [
    song("Hardcore Uproar (Take Me Back) (Radio Edit)", "Trigga", "Sushy"),
    song("Take on Me", "a-ha"),
  ];
  assert.equal(rankSiriSearchResults({title: "Take On Me"}, candidates), 1);
});

test("avoids covers, karaoke and live versions unless asked for", () => {
  const candidates = [
    song("Eye of the Tiger (Karaoke Version)", "Karaoke Hits"),
    song("Eye of the Tiger - Live", "Survivor"),
    song("Eye of the Tiger", "Survivor"),
  ];
  assert.equal(
    rankSiriSearchResults({title: "Eye of the Tiger"}, candidates),
    2,
  );
  assert.equal(
    rankSiriSearchResults({title: "Eye of the Tiger live"}, [
      song("Eye of the Tiger", "Survivor"),
      song("Eye of the Tiger live", "Survivor"),
    ]),
    1,
  );
});

test("prefers the requested artist", () => {
  const candidates = [
    song("Paparazzi", "Girls' Generation"),
    song("Paparazzi", "Lady Gaga"),
  ];
  assert.equal(
    rankSiriSearchResults(
      {title: "Paparazzi", artist: "Lady Gaga"},
      candidates,
    ),
    1,
  );
});

test("returns -1 without results", () => {
  assert.equal(rankSiriSearchResults({title: "Anything"}, []), -1);
});
