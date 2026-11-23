export interface PlayerSettings {
  ownOverlayEnabled?: boolean;
  vlcEnabled?: boolean;
}

/**
 * Whether the touch video screen uses the app's own overlay player. VLC has no
 * controls of its own, so it always runs under the overlay.
 */
export function isOverlayPlayerEnabled(settings: PlayerSettings): boolean {
  return Boolean(settings.ownOverlayEnabled || settings.vlcEnabled);
}

/**
 * Whether the touch video screen hides the navigation header. The overlay's
 * close arrow already leads back, so the header only takes room above the
 * player. It is decided when the screen is pushed rather than once the player
 * is on screen, so the header never shows up and then disappears. The native
 * controls bring no way back, and shorts keep their transparent header with
 * its back button.
 */
export function hidesVideoScreenHeader(
  settings: PlayerSettings,
  reel: boolean | undefined,
): boolean {
  return !reel && isOverlayPlayerEnabled(settings);
}
