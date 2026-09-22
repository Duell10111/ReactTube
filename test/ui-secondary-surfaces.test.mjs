import assert from "node:assert/strict";
import test from "node:test";

import {de} from "../src/localization/de.ts";
import {en} from "../src/localization/en.ts";
import {getTransferPercent} from "../src/ui/patterns/secondarySurfaceModel.ts";

test("bounds transfer progress for download and watch status rows", () => {
  assert.equal(getTransferPercent(-0.2), 0);
  assert.equal(getTransferPercent(0.456), 46);
  assert.equal(getTransferPercent(1.4), 100);
  assert.equal(getTransferPercent(Number.NaN), 0);
});

test("keeps phase 5 secondary-surface copy localized", () => {
  const keys = [
    "login.start",
    "playlist.playAll",
    "downloads.active.empty.title",
    "music.library.empty.title",
    "settings.diagnostics.run",
    "watch.uploadComplete",
  ];

  for (const key of keys) {
    assert.equal(typeof en[key], "string");
    assert.equal(typeof de[key], "string");
    assert.notEqual(en[key], de[key]);
  }
});
