import {deviceType, DeviceType} from "expo-device";
import {useMemo} from "react";
import {Platform, useWindowDimensions} from "react-native";

export default function useGridColumnsPreferred(reels?: boolean) {
  const {width} = useWindowDimensions();

  return useMemo(() => {
    if (Platform.isTV) {
      return undefined;
    } else if (deviceType === DeviceType.TABLET) {
      return Math.max(Math.floor(width / (reels ? 175 : 375)), 2);
    } else if (reels) {
      // Phone grids only on reels
      return Math.floor(width / 175);
    }
  }, [width, reels]);
}
