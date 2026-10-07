import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import {StyleSheet} from "react-native";
import Video, {
  OnVideoErrorData,
  ResizeMode,
  SelectedTrackType,
  VideoRef,
} from "react-native-video";

import {
  VideoComponentRefType,
  VideoComponentType,
} from "./videoPlayer/VideoPlayer";

import Logger from "@/utils/Logger";
import {PlaybackSize, toPlaybackSize} from "@/utils/PlaybackSize";

const LOGGER = Logger.extend("PLAYBACK");

/**
 * How long a load may stay without a result before the source counts as
 * failed — plan phase 4.1.
 *
 * `onError` alone is not enough: when the device lacks the decoder, AVPlayer
 * reports nothing and silently stays in the loading state (measured with a
 * manifest that only offered AV1 — the media server process died, `onLoad`
 * never arrived).
 */
const STALL_TIMEOUT_MS = 20_000;

const NO_TEXT_TRACK = {type: SelectedTrackType.DISABLED};

const VideoPlayerNative = forwardRef<
  VideoComponentRefType,
  VideoComponentType<any>
>((props, ref) => {
  // @ts-ignore
  const videoInfo = props.props.videoInfo;

  const videoRef = useRef<VideoRef>(undefined);

  const onPlaybackFailure: ((reason: string) => void) | undefined =
    props.props.onPlaybackFailure;
  const onPlaybackInfoUpdate: ((size: PlaybackSize) => void) | undefined =
    props.props.onPlaybackInfoUpdate;

  const reportPlaybackSize = (data?: {width?: number; height?: number}) => {
    const size = toPlaybackSize(data);
    if (size) {
      props.onPlaybackSizeChange?.(size);
      onPlaybackInfoUpdate?.(size);
    }
  };

  const stallTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const clearStallTimer = useCallback(() => {
    if (stallTimer.current) {
      clearTimeout(stallTimer.current);
      stallTimer.current = undefined;
    }
  }, []);

  // Every new source gets a fresh watchdog.
  useEffect(() => {
    clearStallTimer();
    stallTimer.current = setTimeout(() => {
      onPlaybackFailure?.(
        `kein Ladeergebnis nach ${STALL_TIMEOUT_MS / 1000} s`,
      );
    }, STALL_TIMEOUT_MS);

    return clearStallTimer;
  }, [clearStallTimer, onPlaybackFailure, props.props.url]);

  // Plan phase 0.4: log native player errors together with the source —
  // the basis for the error ladder from phase 4.
  const onError = useCallback(
    (errorData: OnVideoErrorData) => {
      const uri: string | undefined = props.props.url;
      // The source is already decided when it arrives here (useVideoDetails
      // decides); the name only serves the log.
      const source = uri?.startsWith("data:")
        ? "eigenes HLS"
        : uri?.includes(".m3u8")
          ? "YT-HLS"
          : "progressiv";
      LOGGER.warn(
        `Player-Fehler · source=${source} · ` +
          `host=${uri?.split("/")[2] ?? "?"} · ` +
          `error=${JSON.stringify(errorData?.error ?? errorData)}`,
      );
      clearStallTimer();
      onPlaybackFailure?.(JSON.stringify(errorData?.error ?? errorData));
      props.onError?.(errorData);
    },
    [props, clearStallTimer, onPlaybackFailure],
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
        uri: props.props.url,
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
      // The overlay draws subtitles itself; renditions in the generated
      // manifest would otherwise be rendered a second time by AVPlayer.
      selectedTextTrack={NO_TEXT_TRACK}
      onLoad={data => {
        clearStallTimer();
        reportPlaybackSize(data.naturalSize);
        props.onLoad?.(data);
      }}
      // Android only emits bandwidth events when asked to.
      reportBandwidth
      // HLS variant switches after the load event arrive here with the newly
      // rendered size.
      onBandwidthUpdate={data => reportPlaybackSize(data)}
      onSeek={props.onSeek}
      onError={onError}
      onProgress={data => {
        // Playback runs — the watchdog is no longer needed.
        clearStallTimer();
        props.onProgress?.(data);
      }}
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
