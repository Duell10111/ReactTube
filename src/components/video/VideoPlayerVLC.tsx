import {
  type PlaybackMethods,
  VLCPlayer,
} from "@duell10111/react-native-vlc-media-player";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import {StyleSheet} from "react-native";

import {
  VideoComponentRefType,
  VideoComponentType,
} from "./videoPlayer/VideoPlayer";

import Logger from "@/utils/Logger";
import {PlaybackSize, toPlaybackSize} from "@/utils/PlaybackSize";
import {buildVlcInitOptions} from "@/utils/VlcPlayback";

const LOGGER = Logger.extend("PLAYBACK");

/**
 * How long a load may stay without progress before the source counts as
 * failed. VLC's error state releases the player without an event reaching
 * JS, so the watchdog is the only signal for a source that does not open.
 */
const STALL_TIMEOUT_MS = 20_000;

/** Props `VideoScreen` passes through `VideoComponentProps`. */
interface VideoPlayerVLCProps {
  url: string;
  /** Separate audio stream, attached as an input slave. */
  audioUrl?: string;
  /** Start position in milliseconds. */
  startPosition?: number;
  onPlaybackFailure?: (reason: string) => void;
  onPlaybackInfoUpdate?: (size: PlaybackSize) => void;
}

/**
 * The VLC player behind the custom overlay.
 *
 * VLC decodes VP9 in software, which brings 1440p/2160p to devices whose
 * AVPlayer cannot decode YouTube's high resolutions (see `VlcPlayback.ts`).
 * VLC reports times in milliseconds and seeks by position fraction; this
 * component translates both to the seconds the overlay works with.
 */
const VideoPlayerVLC = forwardRef<
  VideoComponentRefType,
  VideoComponentType<VideoPlayerVLCProps>
>((props, ref) => {
  const {
    url,
    audioUrl,
    startPosition,
    onPlaybackFailure,
    onPlaybackInfoUpdate,
  } = props.props;

  const videoRef = useRef<PlaybackMethods>(null);
  // VLC seeks by fraction of the duration, so the duration has to be known.
  const durationSeconds = useRef(0);
  const currentSeconds = useRef(0);
  const reportedSize = useRef<string>(undefined);

  // The start position is baked into the player options. Taking it only from
  // the first render of a URL keeps a later marker update from restarting
  // the running stream.
  const startSecondsRef = useRef<{url: string; seconds?: number}>(undefined);
  if (startSecondsRef.current?.url !== url) {
    startSecondsRef.current = {
      url,
      seconds: startPosition ? startPosition / 1000 : undefined,
    };
  }
  const startSeconds = startSecondsRef.current.seconds;

  const source = useMemo(
    () => ({
      uri: url,
      // Custom options need the second init type.
      initType: 2 as const,
      initOptions: buildVlcInitOptions({audioUrl, startSeconds}),
    }),
    [url, audioUrl, startSeconds],
  );

  const stallTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const clearStallTimer = useCallback(() => {
    if (stallTimer.current) {
      clearTimeout(stallTimer.current);
      stallTimer.current = undefined;
    }
  }, []);

  // Every new source gets a fresh watchdog.
  useEffect(() => {
    reportedSize.current = undefined;
    clearStallTimer();
    stallTimer.current = setTimeout(() => {
      onPlaybackFailure?.(
        `VLC: kein Fortschritt nach ${STALL_TIMEOUT_MS / 1000} s`,
      );
    }, STALL_TIMEOUT_MS);

    return clearStallTimer;
  }, [clearStallTimer, onPlaybackFailure, url]);

  useImperativeHandle(ref, () => {
    return {
      seek: seconds => {
        if (durationSeconds.current <= 0) {
          return;
        }
        const position = Math.min(
          Math.max(seconds / durationSeconds.current, 0),
          1,
        );
        videoRef.current?.seek(position);
        props.onSeek?.({
          currentTime: currentSeconds.current,
          seekTime: seconds,
        });
      },
      getCurrentPositionSeconds: async () => currentSeconds.current,
    };
  }, [props]);

  return (
    <VLCPlayer
      ref={videoRef}
      style={styles.fullScreen}
      source={source}
      paused={props.paused}
      rate={props.rate}
      onLoad={data => {
        // VLC sends this again whenever the track info changes.
        durationSeconds.current = data.duration / 1000;
        const size = toPlaybackSize(data.videoSize);
        const sizeKey = size ? `${size.width}x${size.height}` : undefined;
        if (size && sizeKey !== reportedSize.current) {
          reportedSize.current = sizeKey;
          props.onPlaybackSizeChange?.(size);
          onPlaybackInfoUpdate?.(size);
        }
        props.onLoad?.({
          duration: data.duration / 1000,
          currentTime: currentSeconds.current,
          naturalSize: {
            width: data.videoSize?.width ?? 0,
            height: data.videoSize?.height ?? 0,
            orientation: "landscape",
          },
          audioTracks: [],
          textTracks: [],
          videoTracks: [],
        });
      }}
      onError={data => {
        LOGGER.warn(
          `VLC-Fehler · host=${url.split("/")[2] ?? "?"} · ` +
            `error=${JSON.stringify(data)}`,
        );
        clearStallTimer();
        onPlaybackFailure?.(`VLC: ${JSON.stringify(data)}`);
      }}
      onProgress={data => {
        // Playback runs — the watchdog is no longer needed.
        clearStallTimer();
        currentSeconds.current = data.currentTime / 1000;
        if (data.duration > 0) {
          durationSeconds.current = data.duration / 1000;
        }
        props.onProgress?.({
          currentTime: data.currentTime / 1000,
          playableDuration: data.duration / 1000,
          seekableDuration: data.duration / 1000,
        });
      }}
      onEnd={() => props.onEnd?.()}
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
});
