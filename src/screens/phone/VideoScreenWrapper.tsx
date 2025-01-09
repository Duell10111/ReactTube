import {NativeStackScreenProps} from "@react-navigation/native-stack";
import React from "react";
import DeviceInfo from "react-native-device-info";

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

  if (!DeviceInfo.isTablet()) {
    return <VideoScreenPhone {...props} />;
  }

  return <VideoScreenTablet {...props} />;
}
