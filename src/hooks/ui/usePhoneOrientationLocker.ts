import {useFocusEffect} from "@react-navigation/native";
import {DeviceType, deviceType} from "expo-device";
import * as ScreenOrientation from "expo-screen-orientation";
import {useCallback} from "react";
import {Platform} from "react-native";

import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("SCREEN_LOCKER");

const isPhone = !Platform.isTV && deviceType !== DeviceType.TABLET;

/**
 * Keeps a phone in portrait while the screen is shown.
 *
 * The lock is global and never released here: releasing it when one locking
 * screen closes (the music player, say) would unlock the whole app while the
 * home screen below still expects portrait. Each locking screen sets it again
 * when it regains focus, and the video screen switches to landscape only for
 * full screen and restores the lock afterwards.
 */
export default function usePhoneOrientationLocker() {
  useFocusEffect(
    useCallback(() => {
      if (isPhone) {
        ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP,
        ).catch(LOGGER.warn);
      }
    }, []),
  );
}
