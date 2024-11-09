import {useRef} from "react";
import {ViewStyle} from "react-native";
import {VideoRef} from "react-native-video";

import VideoWrapper from "@/components/corner-video/components/VideoWrapper";

interface VideoPlayerPhoneProps {
  sourceURL: string;
  style?: ViewStyle;
}

export function VideoPlayerPhone({sourceURL, style}: VideoPlayerPhoneProps) {
  const videoRef = useRef<VideoRef>();

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
        source: {uri: sourceURL},
        resizeMode: "contain",
        controls: true,
      }}
      onPress={() => {
        videoRef.current.pause();
      }}
      ref={videoRef}
    />
  );
}
