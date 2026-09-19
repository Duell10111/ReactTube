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
  VideoRef,
} from "react-native-video";

import {
  VideoComponentRefType,
  VideoComponentType,
} from "./videoPlayer/VideoPlayer";

import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("PLAYBACK");

/**
 * So lange darf ein Ladevorgang ohne Ergebnis bleiben, bevor die Quelle als
 * gescheitert gilt — Plan-Phase 4.1.
 *
 * `onError` allein genügt nicht: fehlt dem Gerät der Decoder, meldet AVPlayer
 * gar nichts und bleibt stumm im Ladezustand stehen (gemessen mit einem
 * Manifest, das nur AV1 anbot — der Media-Server-Prozess starb, `onLoad` kam
 * nie).
 */
const STALL_TIMEOUT_MS = 20_000;

const VideoPlayerNative = forwardRef<
  VideoComponentRefType,
  VideoComponentType<any>
>((props, ref) => {
  // @ts-ignore
  const videoInfo = props.props.videoInfo;

  const videoRef = useRef<VideoRef>(undefined);

  const onPlaybackFailure: ((reason: string) => void) | undefined =
    props.props.onPlaybackFailure;

  const stallTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const clearStallTimer = useCallback(() => {
    if (stallTimer.current) {
      clearTimeout(stallTimer.current);
      stallTimer.current = undefined;
    }
  }, []);

  // Jede neue Quelle bekommt einen frischen Wächter.
  useEffect(() => {
    clearStallTimer();
    stallTimer.current = setTimeout(() => {
      onPlaybackFailure?.(
        `kein Ladeergebnis nach ${STALL_TIMEOUT_MS / 1000} s`,
      );
    }, STALL_TIMEOUT_MS);

    return clearStallTimer;
  }, [clearStallTimer, onPlaybackFailure, props.props.url]);

  // Plan-Phase 0.4: Fehler des nativen Players mit Quelle protokollieren —
  // Grundlage für die Fehler-Ladder aus Phase 4.
  const onError = useCallback(
    (errorData: OnVideoErrorData) => {
      const uri: string | undefined = props.props.url;
      // Die Quelle steht schon fest, wenn sie hier ankommt (useVideoDetails
      // entscheidet); der Name dient nur dem Protokoll.
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
      onLoad={data => {
        clearStallTimer();
        props.onLoad?.(data);
      }}
      onSeek={props.onSeek}
      onError={onError}
      onProgress={data => {
        // Es läuft — der Wächter wird nicht mehr gebraucht.
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
