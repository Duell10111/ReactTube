import {forwardRef, useCallback, useImperativeHandle, useRef} from "react";
import {StyleSheet} from "react-native";
import Video, {
  OnVideoErrorData,
  ResizeMode,
  VideoRef,
} from "react-native-video";

import {
  VideoComponentRefType,
  VideoComponentType,
} from "./videoPlayer/VideoPlayer";

import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("PLAYBACK");

const VideoPlayerNative = forwardRef<
  VideoComponentRefType,
  VideoComponentType<any>
>((props, ref) => {
  // @ts-ignore
  const videoInfo = props.props.videoInfo;

  const videoRef = useRef<VideoRef>(undefined);

  // Plan-Phase 0.4: Fehler des nativen Players mit Quelle protokollieren —
  // Grundlage für die Fehler-Ladder aus Phase 4.
  const onError = useCallback(
    (errorData: OnVideoErrorData) => {
      const uri: string | undefined = props.props.hlsUrl ?? props.props.url;
      LOGGER.warn(
        `Player-Fehler · source=${props.props.hlsUrl ? "YT-HLS" : "HTTP"} · ` +
          `host=${uri?.split("/")[2] ?? "?"} · ` +
          `error=${JSON.stringify(errorData?.error ?? errorData)}`,
      );
      props.onError?.(errorData);
    },
    [props],
  );

  useImperativeHandle(ref, () => {
    return {
      seek: seconds => {
        videoRef.current?.seek?.(seconds);
      },
      getCurrentPositionSeconds: async () =>
        (await videoRef.current?.getCurrentPosition?.()) ?? 0,
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
        startPosition: props.props.startPosition,
      }}
      paused={props.paused}
      rate={props.rate}
      // @ts-expect-error Index selections causes some type error here somehow
      selectedAudioTrack={
        props.audioTrackIndex !== undefined
          ? {
              type: "index",
              value: props.audioTrackIndex,
            }
          : undefined
      }
      onLoad={props.onLoad}
      onSeek={props.onSeek}
      onError={onError}
      onProgress={props.onProgress}
      onEnd={props.onEnd}
      onAudioTracks={props.onAudioTracks}
      controls={false}
      resizeMode={ResizeMode.CONTAIN}
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
