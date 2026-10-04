import assert from "node:assert/strict";
import test from "node:test";

import {PLAYBACK_CLIENTS_SIGNED_IN} from "../src/utils/PlaybackClientProfiles.ts";
import {
  failedAsPrivateVideo,
  isPrivateVideoReason,
} from "../src/utils/privatePlayback.ts";

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

test("a private video failure is told apart from a session problem", () => {
  // What the anonymous chain returned for a private video (2026-10-04).
  assert.equal(
    failedAsPrivateVideo([
      {status: "LOGIN_REQUIRED", reason: "This video is private"},
      {status: "LOGIN_REQUIRED", reason: "Please sign in"},
    ]),
    true,
  );
  // The bot gate and a rejected visitorData must still reach the
  // session self-healing.
  assert.equal(
    failedAsPrivateVideo([
      {status: "LOGIN_REQUIRED", reason: "Sign in to confirm you're not a bot"},
    ]),
    false,
  );
  assert.equal(
    failedAsPrivateVideo([{status: "UNPLAYABLE", reason: "private"}]),
    false,
  );
  assert.equal(failedAsPrivateVideo(undefined), false);
});

test("the signed-in fallback asks TV_DOWNGRADED only", () => {
  assert.deepEqual(PLAYBACK_CLIENTS_SIGNED_IN, ["TV_DOWNGRADED"]);
});
