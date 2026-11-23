import assert from "node:assert/strict";
import test from "node:test";

import {
  getShortLikeCount,
  getShortShareUrl,
  shouldShortFillScreen,
} from "../src/components/shorts/phone/shortActionsModel.ts";

test("applies only the change in rating to the fetched like count", () => {
  assert.equal(getShortLikeCount(100, false, false), 100);
  assert.equal(getShortLikeCount(100, false, true), 101);
  // The fetched count already includes a like given before.
  assert.equal(getShortLikeCount(100, true, true), 100);
  assert.equal(getShortLikeCount(100, true, false), 99);
  assert.equal(getShortLikeCount(0, true, false), 0);
  assert.equal(getShortLikeCount(undefined, false, true), undefined);
});

test("links to the short on YouTube", () => {
  assert.equal(
    getShortShareUrl("KgAixM-DtuM"),
    "https://www.youtube.com/shorts/KgAixM-DtuM",
  );
});

test("fills the screen with a portrait short but not a landscape one", () => {
  const phone = {width: 393, height: 852};
  assert.equal(shouldShortFillScreen({width: 1080, height: 1920}, phone), true);
  assert.equal(
    shouldShortFillScreen({width: 1920, height: 1080}, phone),
    false,
  );
  // A square-ish portrait frame would lose too much of its sides.
  assert.equal(shouldShortFillScreen({width: 900, height: 1000}, phone), false);
  assert.equal(shouldShortFillScreen(undefined, phone), false);
});
