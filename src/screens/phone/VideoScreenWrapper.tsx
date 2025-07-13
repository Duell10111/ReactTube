import {NativeStackScreenProps} from "@react-navigation/native-stack";
import {DeviceType, deviceType} from "expo-device";
import React from "react";

import ReelVideoScreen from "./ReelVideoScreen";

import {RootStackParamList} from "@/navigation/RootStackNavigator";
import VideoScreenPhone from "@/screens/phone/VideoScreenPhone";
import VideoScreenTablet from "@/screens/phone/VideoScreenTablet";

type Props = NativeStackScreenProps<RootStackParamList, "VideoScreen">;

export default function VideoScreenWrapper(props: Props) {
  // TODO:  Not ready yet
  if (props.route.params.reel) {
    return <ReelVideoScreen {...props} />;
  }

  if (deviceType !== DeviceType.TABLET) {
    return <VideoScreenPhone {...props} />;
  }

  return <VideoScreenTablet {...props} />;
}
