import React from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from "react-native";
import {VLCPlayer} from "react-native-vlc-media-player";
import Logger from "../../utils/Logger";
import {YT} from "../../utils/Youtube";
import useYoutubeDash from "../../hooks/video/useYoutubeDash";
import VLCPlayerControls from "./VLCPlayerControls";

const LOGGER = Logger.extend("VIDEO");

interface Props {
  videoInfo: YT.VideoInfo;
  url: string;
  style?: StyleProp<ViewStyle>;
  onEndReached?: () => void;
}

export default function VideoPlayerVLC({
  url,
  style,
  videoInfo,
  ...callbacks
}: Props) {
  const {dashUrl} = useYoutubeDash(videoInfo);

  LOGGER.debug("Dash URL: ", dashUrl);

  return (
    <>
      <ActivityIndicator style={styles.activityIndicator} size={"large"} />
      {dashUrl ? (
        <VLCPlayerControls
          source={{
            // uri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            // uri: "https://sample.vodobox.net/skate_phantom_flex_4k/skate_phantom_flex_4k.m3u8",
            // type: "m3u8",
            // uri: "https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd",
            // type: "mpd",
            uri: url,
          }}
          style={[
            style ?? {
              ...styles.fullScreen,
              // backgroundColor: "rgba(0,34,255,0.6)",
            },
            StyleSheet.absoluteFillObject,
          ]}
          onEnded={() => {
            LOGGER.debug("End reached");
            callbacks.onEndReached?.();
          }}
        />
      ) : null}
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
