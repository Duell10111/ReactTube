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
import useHLS from "../hls/useHLS";
import {useHLSServerContext} from "../hls/HLSServerContext";

const LOGGER = Logger.extend("VIDEO");

interface Props {
  url: string;
  style?: StyleProp<ViewStyle>;
  onEndReached?: () => void;
  videoId: string;
}

export default function VideoComponent({
  url,
  style,
  videoId,
  ...callbacks
}: Props) {
  // const player = useRef<Video>();
  const isFocused = useIsFocused();

  const hlsURL = useHLS(videoId);
  const {originURL} = useHLSServerContext();

  console.log(hlsURL);

  // TODO: Add fallback if HLS Server or HLS URL fetch fails
  if (!hlsURL || !originURL) {
    return null;
  }
  //
  // const localFile = `file://${hlsURL}`;
  // console.log("LocalFile: ", localFile);

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
          // uri: `http://192.168.178.40:7500/video/${videoId}/master.m3u8`,
          uri: `${originURL}/${videoId}/master.m3u8`,
          // uri: localFile,
        }}
        style={[
          style ?? {
            ...styles.fullScreen,
            // backgroundColor: "rgba(0,34,255,0.6)",
          },
          StyleSheet.absoluteFillObject,
        ]}
        controls
        paused={!isFocused}
        fullscreen
        resizeMode={"contain"}
        onLoad={(data: any) =>
          LOGGER.debug("Video Loading...", JSON.stringify(data, null, 4))
        }
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
