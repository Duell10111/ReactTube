import assert from "node:assert/strict";
import test from "node:test";

import {
  parseClassicPlaylistPrivacy,
  parseTVPlaylistBylines,
} from "../src/extraction/playlistHeader.ts";
import {resolveTranslation} from "../src/localization/core.ts";
import {de} from "../src/localization/de.ts";
import {en} from "../src/localization/en.ts";
import {getPlaylistMetadataLine} from "../src/ui/patterns/playlistHeroModel.ts";

const resources = {en, de};
const tDe = (key, values = {}) =>
  resolveTranslation("de", key, values, resources);

test("reads owner, privacy and counts from the TV header bylines", () => {
  // The shape the TV client delivers for Watch later.
  const details = parseTVPlaylistBylines([
    [
      {badgeIcon: "PRIVACY_PRIVATE"},
      {text: "Duell1011"},
      {text: "•"},
      {text: "45 Videos"},
      {text: "•"},
      {text: "Keine Aufrufe"},
    ],
  ]);

  assert.deepEqual(details, {
    ownerName: "Duell1011",
    privacy: "private",
    stats: ["45 Videos", "Keine Aufrufe"],
  });
});

test("tolerates a header without bylines", () => {
  assert.deepEqual(parseTVPlaylistBylines([]), {
    ownerName: undefined,
    privacy: undefined,
    stats: [],
  });
});

test("maps the classic privacy string", () => {
  assert.equal(parseClassicPlaylistPrivacy("PRIVATE"), "private");
  assert.equal(parseClassicPlaylistPrivacy("Unlisted"), "unlisted");
  assert.equal(parseClassicPlaylistPrivacy(undefined), undefined);
});

test("builds the YouTube-style metadata line", () => {
  assert.equal(
    getPlaylistMetadataLine(
      {privacy: "private", stats: ["513 Videos", "Keine Aufrufe"]},
      tDe,
    ),
    "Playlist · Privat · 513 Videos · Keine Aufrufe",
  );
  assert.equal(getPlaylistMetadataLine({stats: [" "]}, tDe), "Playlist");
});
