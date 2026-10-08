import assert from "node:assert/strict";
import test from "node:test";

import {describeError} from "../src/utils/describeError.ts";

test("converts thrown values into displayable text", () => {
  assert.equal(describeError(new Error("Rejected")), "Rejected");
  assert.equal(describeError(new TypeError("")), "TypeError");
  assert.equal(describeError("plain"), "plain");
  assert.equal(describeError({code: 1}), JSON.stringify({code: 1}));
  assert.equal(describeError(42), "42");
  assert.equal(describeError(undefined), undefined);
  assert.equal(describeError(null), undefined);
});

test("falls back for circular objects", () => {
  const circular = {};
  circular.self = circular;
  assert.equal(describeError(circular), "[object Object]");
});
