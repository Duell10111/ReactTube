import {forwardRef, useImperativeHandle, useRef} from "react";
import {StyleSheet} from "react-native";
import {VLCPlayer} from "react-native-vlc-media-player";

import {
  VideoComponentRefType,
  VideoComponentType,
} from "./videoPlayer/VideoPlayer";

const VideoPlayerVLC = forwardRef<
  VideoComponentRefType,
  VideoComponentType<any>
>((props, ref) => {
  const videoRef = useRef<VLCPlayer>(undefined);

  // Save current duration to calculate position to seek to
  const durationSeconds = useRef(0);

  useImperativeHandle(ref, () => {
    return {
      seek: seconds => {
        const seekPosition = seconds / durationSeconds.current;
        videoRef.current?.seek?.(seekPosition);
      },
      getCurrentPositionSeconds: async () => 0,
    };
  }, []);

  return (
    <VLCPlayer
      // @ts-ignore
      ref={videoRef}
      style={styles.fullScreen}
      source={{
        // uri: "https://sample.vodobox.net/skate_phantom_flex_4k/skate_phantom_flex_4k.m3u8",
        uri: props.props.hlsUrl ?? props.props.url,
      }}
      paused={props.paused}
      rate={props.rate}
      onLoad={data => {
        durationSeconds.current = data.duration / 1000;
        props.onLoad({
          duration: data.duration / 1000,
          naturalSize: {
            ...data.videoSize,
            orientation: "landscape",
          },
          currentTime: 0,
          // Empty VideoTracks as not provided
          videoTracks: [],
          // Add index with value of id
          textTracks: data.textTracks?.map(item => ({...item, index: item.id})),
          audioTracks: data.audioTracks?.map(item => ({
            ...item,
            index: item.id,
          })),
        });
      }}
      onSeek={props.onSeek}
      // @ts-ignore Ignore error atm
      onError={data => props.onError({target: data.target, error: data})}
      onProgress={data =>
        // Transform time to seconds
        props.onProgress({
          currentTime: data.currentTime / 1000,
          playableDuration: data.duration / 1000,
          seekableDuration: data.duration / 1000,
        })
      }
      onEnd={props.onEnd}
    />
  );
});

export default VideoPlayerVLC;

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
