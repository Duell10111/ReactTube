import {useIsFocused, useNavigation} from "@react-navigation/native";
import {DeviceType, deviceType} from "expo-device";
import * as ScreenOrientation from "expo-screen-orientation";
import {DeviceMotion} from "expo-sensors";
import {useCallback, useEffect, useLayoutEffect, useRef, useState} from "react";
import {BackHandler, Platform} from "react-native";

import {
  classifyDeviceOrientation,
  getRotationFullscreenAction,
  initialRotationState,
  updateRotation,
} from "@/components/video/phone/phoneRotationModel";
import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("PLAYER_FULLSCREEN");

/** Often enough to react within half a second, rare enough to stay cheap. */
const MOTION_INTERVAL_MS = 150;

const isPhone = !Platform.isTV && deviceType !== DeviceType.TABLET;

interface PlayerFullscreenOptions {
  /**
   * Turning the phone opens and closes full screen, as on YouTube. Only for
   * the overlay player: the native controls bring their own full screen.
   */
  followRotation?: boolean;
}

/**
 * Full screen of the phone/tablet overlay player.
 *
 * The player itself only grows to fill the screen; this hook handles what
 * belongs to the screen around it: the navigation header and the back swipe
 * go away, the hardware back button leaves full screen first, and a phone
 * turns to landscape. The status bar and the Android navigation bar are
 * hidden declaratively by the screen. A tablet keeps its orientation — it has
 * room for a 16:9 player either way, and forcing a rotation there would be
 * surprising.
 */
export default function usePlayerFullscreen({
  followRotation = false,
}: PlayerFullscreenOptions = {}) {
  const navigation = useNavigation();
  const focused = useIsFocused();
  const [fullscreen, setFullscreen] = useState(false);
  const fullscreenRef = useRef(fullscreen);
  fullscreenRef.current = fullscreen;

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

  // A screen pushed on top, such as a channel opened from an end card, must
  // not inherit the landscape lock or the hidden header.
  useEffect(
    () => navigation.addListener("blur", () => setFullscreen(false)),
    [navigation],
  );

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
    if (!fullscreen || !isPhone) {
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

  // The phone stays locked to portrait outside full screen (the home screen
  // holds that lock), so the interface never turns and reports no rotation.
  // Gravity still shows how the phone is held.
  useEffect(() => {
    if (!followRotation || !focused || !isPhone) {
      return;
    }
    let active = true;
    let subscription: {remove: () => void} | undefined;
    let rotation = initialRotationState;

    DeviceMotion.isAvailableAsync()
      .then(available => {
        if (!available || !active) {
          return;
        }
        DeviceMotion.setUpdateInterval(MOTION_INTERVAL_MS);
        subscription = DeviceMotion.addListener(measurement => {
          const gravity = measurement.accelerationIncludingGravity;
          if (!gravity) {
            return;
          }
          const result = updateRotation(
            rotation,
            classifyDeviceOrientation(gravity.x, gravity.y, gravity.z),
            Date.now(),
          );
          rotation = result.state;
          if (!result.changed) {
            return;
          }
          const action = getRotationFullscreenAction(
            result.changed,
            fullscreenRef.current,
          );
          if (action) {
            setFullscreen(action === "enter");
          }
        });
      })
      .catch(LOGGER.warn);

    return () => {
      active = false;
      subscription?.remove();
    };
  }, [focused, followRotation]);

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
