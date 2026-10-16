import assert from "node:assert/strict";
import test from "node:test";

import {normalizeSiriQuery} from "../src/siri/normalizeSiriQuery.ts";

test("strips the app name Siri leaves in the media name", () => {
  // Media names recognized on an iPhone 15 Pro (iOS 27, German Siri).
  assert.equal(
    normalizeSiriQuery("Bohemian Rhapsody in React Tube"),
    "Bohemian Rhapsody",
  );
  assert.equal(normalizeSiriQuery("Paparazzi von React Tube"), "Paparazzi");
  assert.equal(normalizeSiriQuery("Take On Me in React Tube"), "Take On Me");
  assert.equal(
    normalizeSiriQuery("Eye of the Tiger in React Tube"),
    "Eye of the Tiger",
  );
});

test("strips the misheard app name only after a connector", () => {
  // Recognized on the second cold-start run.
  assert.equal(normalizeSiriQuery("Take On Me in the Tube"), "Take On Me");
  assert.equal(
    normalizeSiriQuery("Eye of the Tiger in the Tube"),
    "Eye of the Tiger",
  );
  assert.equal(normalizeSiriQuery("Paparazzi von der Tube"), "Paparazzi");
  assert.equal(normalizeSiriQuery("Down the Tube"), "Down the Tube");
  assert.equal(normalizeSiriQuery("Tube"), "Tube");
});

test("handles spelling variants and English connectors", () => {
  assert.equal(normalizeSiriQuery("Take On Me in ReactTube"), "Take On Me");
  assert.equal(normalizeSiriQuery("Take On Me on reacttube"), "Take On Me");
  assert.equal(
    normalizeSiriQuery("Take On Me with the React Tube app"),
    "Take On Me",
  );
  assert.equal(
    normalizeSiriQuery("Take On Me auf der React Tube App"),
    "Take On Me",
  );
  assert.equal(normalizeSiriQuery("Take On Me React Tube"), "Take On Me");
});

test("keeps queries without the app name untouched", () => {
  assert.equal(normalizeSiriQuery("Bohemian Rhapsody"), "Bohemian Rhapsody");
  assert.equal(normalizeSiriQuery("Live in Berlin"), "Live in Berlin");
  assert.equal(normalizeSiriQuery("  Lo-Fi   Beats "), "Lo-Fi Beats");
});

test("returns undefined when nothing but the app name is left", () => {
  assert.equal(normalizeSiriQuery("React Tube"), undefined);
  assert.equal(normalizeSiriQuery(""), undefined);
  assert.equal(normalizeSiriQuery(undefined), undefined);
});
