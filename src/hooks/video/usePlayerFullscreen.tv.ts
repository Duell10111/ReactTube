import {useCallback, useState} from "react";

interface PlayerFullscreenOptions {
  followRotation?: boolean;
}

/**
 * TV variant of the phone overlay player's full screen hook. The phone version
 * imports expo-screen-orientation and expo-sensors, which have no tvOS native
 * module; importing them throws while the bundle loads and leaves the app on
 * the splash screen. The phone video screen is still bundled on TV through the
 * root navigator, so this keeps the same API without touching native modules.
 */
export default function usePlayerFullscreen(
  _options: PlayerFullscreenOptions = {},
) {
  const [fullscreen, setFullscreen] = useState(false);

  const toggleFullscreen = useCallback(
    () => setFullscreen(value => !value),
    [],
  );

  return {fullscreen, setFullscreen, toggleFullscreen};
}
