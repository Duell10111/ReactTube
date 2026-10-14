import {useNavigation} from "@react-navigation/native";
import {DeviceType, deviceType} from "expo-device";
import * as ScreenOrientation from "expo-screen-orientation";
import {useCallback, useEffect, useLayoutEffect, useState} from "react";
import {BackHandler, Platform} from "react-native";

import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("PLAYER_FULLSCREEN");

/**
 * Full screen of the phone/tablet overlay player.
 *
 * The player itself only grows to fill the screen; this hook handles what
 * belongs to the screen around it: the navigation header and the back swipe
 * go away, the hardware back button leaves full screen first, and a phone
 * turns to landscape. A tablet keeps its orientation — it has room for a 16:9
 * player either way, and forcing a rotation there would be surprising.
 */
export default function usePlayerFullscreen() {
  const navigation = useNavigation();
  const [fullscreen, setFullscreen] = useState(false);

  const toggleFullscreen = useCallback(
    () => setFullscreen(value => !value),
    [],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: !fullscreen,
      gestureEnabled: !fullscreen,
    });
  }, [fullscreen, navigation]);

  useEffect(() => {
    if (!fullscreen) {
      return;
    }
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setFullscreen(false);
      return true;
    });
    return () => sub.remove();
  }, [fullscreen]);

  useEffect(() => {
    if (!fullscreen || Platform.isTV || deviceType === DeviceType.TABLET) {
      return;
    }
    // The lock in place before, usually the portrait lock of the home
    // screen. It is put back on leaving, so the rest of the app keeps it.
    const previousLock = ScreenOrientation.getOrientationLockAsync()
      .then(restorableLock, () => ScreenOrientation.OrientationLock.PORTRAIT_UP)
      .then(async lock => {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE,
        );
        return lock;
      });
    previousLock.catch(LOGGER.warn);

    return () => {
      previousLock
        .then(lock => ScreenOrientation.lockAsync(lock))
        .catch(LOGGER.warn);
    };
  }, [fullscreen]);

  return {fullscreen, setFullscreen, toggleFullscreen};
}

/** `OTHER` and `UNKNOWN` cannot be passed back to `lockAsync`. */
function restorableLock(
  lock: ScreenOrientation.OrientationLock,
): ScreenOrientation.OrientationLock {
  if (
    lock === ScreenOrientation.OrientationLock.OTHER ||
    lock === ScreenOrientation.OrientationLock.UNKNOWN
  ) {
    return ScreenOrientation.OrientationLock.PORTRAIT_UP;
  }
  return lock;
}
