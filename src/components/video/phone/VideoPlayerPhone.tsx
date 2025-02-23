import React, {forwardRef} from "react";
import {Platform, ViewStyle} from "react-native";
import {VideoRef} from "react-native-video";

import VideoWrapper from "@/components/corner-video/components/VideoWrapper";

interface VideoPlayerPhoneProps {
  sourceURL: string;
  style?: ViewStyle;
  onPipPress?: () => void;
  children?: React.ReactElement;
}

export const VideoPlayerPhone = forwardRef<VideoRef, VideoPlayerPhoneProps>(
  ({sourceURL, style, onPipPress, children}, ref) => {
    return (
      <VideoWrapper
        style={style}
        cornerProps={{
          width: 300,
          height: 250,
          top: 50,
          bottom: 50,
          left: 7,
          right: 7,
        }}
        videoProps={{
          // @ts-ignore
          source: {uri: sourceURL},
          resizeMode: "contain",
          controls: true,
          // TODO: Check if working correctly on android and ios
          playInBackground: Platform.OS === "android",
          enterPictureInPictureOnLeave: Platform.OS === "ios",
          ignoreSilentSwitch: "ignore",
        }}
        onPress={onPipPress}
        ref={ref}
        children={children}
      />
    );
  },
);
