import React from "react";
import useVideoDetails from "../hooks/useVideoDetails";
import Video from "react-native-video";
import {useRef} from "react";
import {StyleProp, StyleSheet, ViewStyle} from "react-native";

interface Props {
  url: string;
  style?: StyleProp<ViewStyle>;
}

export default function VideoComponent({url, style}: Props) {
  const player = useRef<Video>();

  return (
    <Video
      source={{
        uri: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      }}
      style={
        style ?? {
          ...styles.fullScreen,
          backgroundColor: "blue",
        }
      }
    />
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
});
