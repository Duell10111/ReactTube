import assert from "node:assert/strict";
import test from "node:test";

import {PLAYBACK_CLIENTS_SIGNED_IN} from "../src/utils/PlaybackClientProfiles.ts";
import {
  isAgeRestrictedReason,
  isPrivateVideoReason,
  needsSignedInPlayback,
} from "../src/utils/signedInPlayback.ts";

test("recognises the private-video reason", () => {
  assert.equal(isPrivateVideoReason("This video is private"), true);
  assert.equal(isPrivateVideoReason("Private video"), true);
  assert.equal(
    isPrivateVideoReason("Sign in to confirm you're not a bot"),
    false,
  );
  assert.equal(isPrivateVideoReason("Please sign in"), false);
  assert.equal(isPrivateVideoReason(undefined), false);
});

test("recognises the age gate but not the bot gate", () => {
  // Reasons measured for an age-restricted video on 2026-10-04.
  assert.equal(isAgeRestrictedReason("Sign in to confirm your age"), true);
  assert.equal(
    isAgeRestrictedReason("This video may be inappropriate for some users."),
    true,
  );
  assert.equal(
    isAgeRestrictedReason("Sign in to confirm you're not a bot"),
    false,
  );
  assert.equal(isAgeRestrictedReason("This video is private"), false);
});

test("a signed-in-only failure is told apart from a session problem", () => {
  assert.equal(
    needsSignedInPlayback([
      {status: "LOGIN_REQUIRED", reason: "This video is private"},
      {status: "LOGIN_REQUIRED", reason: "Please sign in"},
    ]),
    true,
  );
  assert.equal(
    needsSignedInPlayback([
      {status: "UNPLAYABLE", reason: "This video is unavailable"},
      {status: "LOGIN_REQUIRED", reason: "Sign in to confirm your age"},
    ]),
    true,
  );
  // The bot gate and a rejected visitorData must still reach the session
  // self-healing.
  assert.equal(
    needsSignedInPlayback([
      {status: "LOGIN_REQUIRED", reason: "Sign in to confirm you're not a bot"},
    ]),
    false,
  );
  assert.equal(
    needsSignedInPlayback([{status: "UNPLAYABLE", reason: "private"}]),
    false,
  );
  assert.equal(needsSignedInPlayback(undefined), false);
});

test("the signed-in fallback asks TV_DOWNGRADED only", () => {
  assert.deepEqual(PLAYBACK_CLIENTS_SIGNED_IN, ["TV_DOWNGRADED"]);
});
