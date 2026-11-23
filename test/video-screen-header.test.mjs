import assert from "node:assert/strict";
import test from "node:test";

import {
  hidesVideoScreenHeader,
  isOverlayPlayerEnabled,
} from "../src/hooks/video/videoScreenHeader.ts";

test("treats VLC as running under the overlay", () => {
  assert.equal(isOverlayPlayerEnabled({ownOverlayEnabled: true}), true);
  assert.equal(isOverlayPlayerEnabled({vlcEnabled: true}), true);
  assert.equal(isOverlayPlayerEnabled({}), false);
});

test("hides the header only for overlay videos, never for shorts", () => {
  assert.equal(hidesVideoScreenHeader({ownOverlayEnabled: true}, false), true);
  assert.equal(
    hidesVideoScreenHeader({ownOverlayEnabled: true}, undefined),
    true,
  );
  // Shorts keep their transparent header with its back button.
  assert.equal(hidesVideoScreenHeader({ownOverlayEnabled: true}, true), false);
  // The native controls bring no way back.
  assert.equal(hidesVideoScreenHeader({}, false), false);
});
