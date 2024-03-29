import {StyleSheet} from "react-native";
import Video from "react-native-video";

import {VideoComponentType} from "./videoPlayer/VideoPlayer";

export default function VideoPlayerNative(props: VideoComponentType<object>) {
  const videoInfo = props.props.videoInfo;

  return (
    <Video
      style={styles.fullScreen}
      source={{
        // uri: "https://sample.vodobox.net/skate_phantom_flex_4k/skate_phantom_flex_4k.m3u8",
        uri: props.props.hlsUrl ?? props.props.url,
        // @ts-ignore Own version
        title: videoInfo?.title,
        subtitle: videoInfo?.author?.name,
        description: videoInfo?.description,
        customImageUri: videoInfo?.thumbnailImage?.url,
      }}
      paused={props.paused}
      onLoad={props.onLoad}
      onSeek={props.onSeek}
      onError={props.onError}
      onProgress={props.onProgress}
      onEnd={props.onEnd}
      controls={false}
      muted
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
  activityIndicator: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
});
