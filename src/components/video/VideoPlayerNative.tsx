import {forwardRef, useImperativeHandle, useRef} from "react";
import {StyleSheet} from "react-native";
import Video, {ResizeMode, VideoRef} from "react-native-video";

import {
  VideoComponentRefType,
  VideoComponentType,
} from "./videoPlayer/VideoPlayer";

const VideoPlayerNative = forwardRef<
  VideoComponentRefType,
  VideoComponentType<any>
>((props, ref) => {
  // @ts-ignore
  const videoInfo = props.props.videoInfo;

  const videoRef = useRef<VideoRef>();

  useImperativeHandle(ref, () => {
    return {
      seek: seconds => {
        videoRef.current?.seek?.(seconds);
      },
    };
  }, []);

  return (
    <Video
      // @ts-ignore
      ref={videoRef}
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
      resizeMode={ResizeMode.CONTAIN}
      // muted
      // repeat
    />
  );
});

export default VideoPlayerNative;

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
