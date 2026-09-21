import {NativeStackScreenProps} from "@react-navigation/native-stack";
import React from "react";

import ReelVideoScreen from "./ReelVideoScreen";

import {RootStackParamList} from "@/navigation/RootStackNavigator";
import VideoDetailScreen from "@/screens/phone/VideoDetailScreen";

type Props = NativeStackScreenProps<RootStackParamList, "VideoScreen">;

export default function VideoScreenWrapper(props: Props) {
  // TODO:  Not ready yet
  if (props.route.params.reel) {
    return <ReelVideoScreen {...props} />;
  }

  // Phone and tablet share one detail screen. It arranges itself from the
  // layout class and the orientation, so the device type no longer picks the
  // screen — a tablet in portrait is laid out like a large phone, and a phone
  // in landscape splits the same way a tablet does.
  return <VideoDetailScreen {...props} />;
}
