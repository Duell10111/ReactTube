import {NativeStackScreenProps} from "@react-navigation/native-stack";
import React from "react";

import ShortsScreen from "./ShortsScreen";

import {RootStackParamList} from "@/navigation/RootStackNavigator";
import VideoScreen from "@/screens/VideoScreen";

type Props = NativeStackScreenProps<RootStackParamList, "VideoScreen">;

/** TV counterpart of the phone wrapper: shorts get their own vertical player. */
export default function VideoScreenWrapper(props: Props) {
  if (props.route.params.reel) {
    return <ShortsScreen {...props} />;
  }

  return <VideoScreen {...props} />;
}
