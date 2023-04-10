import React from "react";
import useVideoDetails from "../hooks/useVideoDetails";
import Video from "react-native-video";
import {useRef} from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from "react-native";
import {useYoutubeContext} from "../context/YoutubeContext";

interface Props {
  url: string;
  style?: StyleProp<ViewStyle>;
}

export default function VideoComponent({url, style}: Props) {
  const player = useRef<Video>();

  return (
    <>
      <ActivityIndicator style={styles.activityIndicator} size={"large"} />
      <Video
        source={{
          // uri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          uri: url,
        }}
        style={[
          style ?? {
            ...styles.fullScreen,
            backgroundColor: "rgba(0,34,255,0.6)",
          },
          StyleSheet.absoluteFillObject,
        ]}
        controls
        paused
        fullscreen
        resizeMode={"contain"}
        onLoad={data =>
          console.log("Video Loading...", JSON.stringify(data, null, 4))
        }
        onLoadStart={() => console.log("Video Start Loading...")}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  activityIndicator: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
});
