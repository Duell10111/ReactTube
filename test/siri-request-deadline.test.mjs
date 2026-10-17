import assert from "node:assert/strict";
import test from "node:test";

import {isSiriRequestExpired} from "../src/siri/siriRequestDeadline.ts";

test("requests without a deadline never expire", () => {
  // continueInApp requests: Siri does not wait for an answer.
  assert.equal(isSiriRequestExpired({}, Number.MAX_SAFE_INTEGER), false);
});

test("requests expire once Siri stopped waiting", () => {
  assert.equal(isSiriRequestExpired({deadline: 1000}, 999), false);
  assert.equal(isSiriRequestExpired({deadline: 1000}, 1000), false);
  assert.equal(isSiriRequestExpired({deadline: 1000}, 1001), true);
});
