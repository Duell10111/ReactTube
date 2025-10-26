import {DeviceType, deviceType} from "expo-device";
import * as ScreenOrientation from "expo-screen-orientation";
import {useLayoutEffect} from "react";
import {Platform} from "react-native";

import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("SCREEN_LOCKER");

export default function usePhoneOrientationLocker() {
  useLayoutEffect(() => {
    if (!Platform.isTV && deviceType !== DeviceType.TABLET) {
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP,
      ).catch(LOGGER.warn);
      return () => {
        ScreenOrientation.unlockAsync().catch(LOGGER.warn);
      };
    }
  }, []);
}
