/**
 * Playback that only the signed-in account can get: the user's private videos
 * and age-restricted videos.
 *
 * Kept free of React Native imports so the Node test runner can load it.
 *
 * Measured on 2026-10-04 with the TV OAuth session:
 *
 * - Anonymous clients answer a private video with `LOGIN_REQUIRED (This video
 *   is private)` and an age-restricted one with `LOGIN_REQUIRED (Sign in to
 *   confirm your age)` (`IOS`: "This video may be inappropriate for some
 *   users.").
 * - Signed in, `TV` stays `UNPLAYABLE (The page needs to be reloaded.)` with or
 *   without a PoToken, and `WEB`/`MWEB` reject the TV token with HTTP 400.
 *   Only `TV_DOWNGRADED` returns the formats, with URLs and uncapped byte ranges
 *   across the whole file (16 s and 82 min private videos, an age-restricted
 *   video; 206 at every offset). No YouTube HLS and no SABR URL come with it,
 *   so the app's own HLS generator plays it.
 * - The account matters: a brand account has no age, so age-restricted videos
 *   need the primary Google account; the brand channel's private videos then
 *   need `onBehalfOfUser` set to that channel (see `accountChannels.ts`).
 */

const PRIVATE_VIDEO_REASON = /\bprivate\b/i;

const AGE_RESTRICTED_REASON =
  /confirm your age|inappropriate for some users|age[- ]restricted/i;

/** Whether a playability reason says the video is private. */
export function isPrivateVideoReason(reason?: string | null): boolean {
  return !!reason && PRIVATE_VIDEO_REASON.test(reason);
}

/** Whether a playability reason is YouTube's age gate. */
export function isAgeRestrictedReason(reason?: string | null): boolean {
  return !!reason && AGE_RESTRICTED_REASON.test(reason);
}

/**
 * Whether the anonymous chain failed because only a signed-in account may
 * watch the video — then the failure says nothing about the session, and a
 * signed-in attempt makes sense.
 */
export function needsSignedInPlayback(
  attempts: {status?: string; reason?: string}[] | undefined,
): boolean {
  return !!attempts?.some(
    attempt =>
      attempt.status === "LOGIN_REQUIRED" &&
      (isPrivateVideoReason(attempt.reason) ||
        isAgeRestrictedReason(attempt.reason)),
  );
}
