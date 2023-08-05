import React from "react";
import Video from "react-native-video";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from "react-native";
import Logger from "../utils/Logger";
import {useIsFocused} from "@react-navigation/native";

const LOGGER = Logger.extend("VIDEO");

interface Props {
  videoId: string;
  url: string;
  isLiveSteam?: boolean;
  style?: StyleProp<ViewStyle>;
  onEndReached?: () => void;
  onPlaybackInfoUpdate?: (playbackInfos: {
    width: number;
    height: number;
  }) => void;
}

export default function VideoComponent({
  url,
  videoId,
  style,
  ...callbacks
}: Props) {
  // const player = useRef<Video>();
  const isFocused = useIsFocused();

  return (
    <>
      <ActivityIndicator style={styles.activityIndicator} size={"large"} />
      <Video
        source={{
          // uri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          // uri: "https://sample.vodobox.net/skate_phantom_flex_4k/skate_phantom_flex_4k.m3u8",
          // type: "m3u8",
          // uri: "https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd",
          // type: "mpd",
          // uri: `http://localhost:7500/video/${videoId}/master.m3u8`,
          uri: url,
        }}
        style={[
          style ?? {
            ...styles.fullScreen,
          },
          StyleSheet.absoluteFillObject,
        ]}
        controls
        paused={!isFocused}
        fullscreen
        resizeMode={"contain"}
        onLoad={(data: any) => {
          LOGGER.debug("Video Loading...", JSON.stringify(data, null, 4));
          callbacks.onPlaybackInfoUpdate?.({
            width: data?.naturalSize?.width,
            height: data?.naturalSize?.height,
          });
        }}
        onLoadStart={() => LOGGER.debug("Video Start Loading...")}
        onError={LOGGER.warn}
        onEnd={() => {
          LOGGER.debug("End reached");
          callbacks.onEndReached?.();
        }}
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
