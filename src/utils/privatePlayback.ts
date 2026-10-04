/**
 * Playback of the signed-in user's private videos.
 *
 * Kept free of React Native imports so the Node test runner can load it.
 *
 * Measured on 2026-10-04 with the TV OAuth session: anonymous clients answer a
 * private video with `LOGIN_REQUIRED (This video is private)`, `TV` with
 * `UNPLAYABLE (The page needs to be reloaded.)` whether a PoToken is sent or
 * not, and `WEB`/`MWEB` reject the TV token with HTTP 400. Only
 * `TV_DOWNGRADED` (TVHTML5 with an old version and Cobalt UA) returns the
 * formats, with URLs and uncapped byte ranges across the whole file — tested
 * with a 16 s video and an 82 min blocked one (1.8 GB, 720p50, 206 at every
 * offset). No YouTube HLS and no SABR URL come with it, so the app's own HLS
 * generator is the way to play it.
 */

const PRIVATE_VIDEO_REASON = /\bprivate\b/i;

/** Whether a playability reason says the video is private. */
export function isPrivateVideoReason(reason?: string | null): boolean {
  return !!reason && PRIVATE_VIDEO_REASON.test(reason);
}

/**
 * Whether the anonymous chain failed because the video is private — then the
 * failure says nothing about the session, and a signed-in attempt makes sense.
 */
export function failedAsPrivateVideo(
  attempts: {status?: string; reason?: string}[] | undefined,
): boolean {
  return !!attempts?.some(
    attempt =>
      attempt.status === "LOGIN_REQUIRED" &&
      isPrivateVideoReason(attempt.reason),
  );
}
