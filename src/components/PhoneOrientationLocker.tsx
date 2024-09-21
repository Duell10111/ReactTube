import React from "react";
import {Platform} from "react-native";
import DeviceInfo from "react-native-device-info";
import {OrientationLocker} from "react-native-orientation-locker";

export function PhoneOrientationLocker() {
  if (!Platform.isTV && !DeviceInfo.isTablet()) {
    return <OrientationLocker orientation={"PORTRAIT"} />;
  }
  return null;
}
