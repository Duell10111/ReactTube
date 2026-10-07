import assert from "node:assert/strict";
import test from "node:test";

import {
  DISLIKE_OVERRIDE,
  LIKE_OVERRIDE,
  NO_RATING_OVERRIDE,
  resolveRating,
} from "../src/hooks/video/ratingOverride.ts";

test("shows the reported rating without an override", () => {
  assert.deepEqual(resolveRating({liked: true, disliked: false}, {}), {
    liked: true,
    disliked: false,
  });
  assert.deepEqual(resolveRating(undefined, {}), {
    liked: undefined,
    disliked: undefined,
  });
});

test("lets an override replace the reported rating", () => {
  const reported = {liked: false, disliked: true};
  assert.deepEqual(resolveRating(reported, LIKE_OVERRIDE), {
    liked: true,
    disliked: false,
  });
  assert.deepEqual(resolveRating(reported, NO_RATING_OVERRIDE), {
    liked: false,
    disliked: false,
  });
  assert.deepEqual(resolveRating({liked: true}, DISLIKE_OVERRIDE), {
    liked: false,
    disliked: true,
  });
});

test("leaves the reported rating untouched, so a rollback restores it", () => {
  const reported = {liked: false, disliked: false};
  resolveRating(reported, LIKE_OVERRIDE);
  assert.deepEqual(resolveRating(reported, {}), {
    liked: false,
    disliked: false,
  });
});
