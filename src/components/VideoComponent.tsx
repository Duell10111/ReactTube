import {useIsFocused} from "@react-navigation/native";
import React, {useCallback, useEffect, useMemo, useRef} from "react";
import {
  ActivityIndicator,
  Platform,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from "react-native";
import Video, {
  Chapters,
  OnProgressData,
  ResizeMode,
  VideoRef,
} from "react-native-video";

import Logger from "../utils/Logger";

import {YTChapter, YTVideoInfo} from "@/extraction/Types";
import {PlaybackSize, toPlaybackSize} from "@/utils/PlaybackSize";

const LOGGER = Logger.extend("VIDEO");

/**
 * How long a load may stay without a result before the source counts as
 * failed. Generous on purpose: a slow connection should not wrongly cost a
 * ladder step, but a dead decoder should not hang forever either.
 */
const STALL_TIMEOUT_MS = 20_000;

interface Props {
  /**
   * The source that currently applies.
   *
   * The ladder in `useVideoDetails` (plan phase 4.1) decides which one that
   * is — this player only plays it and reports back when it does not work.
   * Until phase 2c a second source (`hlsUrl ?? url`) lived here and displaced
   * the chosen one; that bug cost a whole device run.
   */
  url: string;
  /** Start position — carries the playback position across a ladder step. */
  startPositionSeconds?: number;
  /**
   * Reports that this source does not work, as an error or a stall.
   * The ladder decides what follows from it.
   */
  onPlaybackFailure?: (reason: string) => void;
  style?: StyleProp<ViewStyle>;
  videoInfo?: YTVideoInfo;
  chapters?: YTChapter[];
  fullscreen?: boolean;
  onEndReached?: () => void;
  /**
   * Called on load and whenever the rendered size changes, e.g. when HLS
   * switches to another variant.
   */
  onPlaybackInfoUpdate?: (playbackInfos: PlaybackSize) => void;
  // Reels controls
  paused?: boolean;
  controls?: boolean;
  repeat?: boolean;
  resizeMode?: ResizeMode;
  onProgress?: (data: OnProgressData) => void;
}

export default function VideoComponent({
  url,
  startPositionSeconds,
  onPlaybackFailure,
  videoInfo,
  fullscreen,
  style,
  paused,
  controls,
  repeat,
  resizeMode,
  ...callbacks
}: Props) {
  const playerRef = useRef<VideoRef>(undefined);
  const isFocused = useIsFocused();

  /**
   * Stall watchdog — plan phase 4.1.
   *
   * **Why `onError` is not enough:** when the device lacks the decoder,
   * AVPlayer reports no error. Measured with a manifest that only offered AV1,
   * the media server process died, and neither `onLoad` nor `onError` ever
   * arrived — an endless spinner for the user. So if loading stays without a
   * result for too long, the source counts as failed.
   */
  const stallTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const clearStallTimer = useCallback(() => {
    if (stallTimer.current) {
      clearTimeout(stallTimer.current);
      stallTimer.current = undefined;
    }
  }, []);

  const armStallTimer = useCallback(() => {
    clearStallTimer();
    stallTimer.current = setTimeout(() => {
      onPlaybackFailure?.(
        `kein Ladeergebnis nach ${STALL_TIMEOUT_MS / 1000} s`,
      );
    }, STALL_TIMEOUT_MS);
  }, [clearStallTimer, onPlaybackFailure]);

  // A source change clears the watchdog; the new load arms it again.
  useEffect(() => clearStallTimer, [clearStallTimer, url]);

  const parsedChapters = useMemo(() => {
    return videoInfo?.chapters?.map(mapChapters) ?? [];
  }, [videoInfo?.chapters]);

  useEffect(() => {
    if (fullscreen) {
      playerRef.current?.presentFullscreenPlayer();
    } else {
      playerRef.current?.dismissFullscreenPlayer();
    }
  }, [fullscreen]);

  const videoURL = url;

  const reportPlaybackSize = (data?: {width?: number; height?: number}) => {
    const size = toPlaybackSize(data);
    if (size) {
      callbacks.onPlaybackInfoUpdate?.(size);
    }
  };

  return (
    <>
      <ActivityIndicator style={styles.activityIndicator} size={"large"} />
      <Video
        key={videoURL}
        // @ts-ignore
        ref={playerRef}
        source={{
          // uri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          // uri: "https://sample.vodobox.net/skate_phantom_flex_4k/skate_phantom_flex_4k.m3u8",
          // type: "m3u8",
          // uri: "https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd",
          // type: "mpd",
          // uri: `http://localhost:7500/video/${videoId}/master.m3u8`,
          uri: videoURL,
          metadata: {
            title: videoInfo?.title,
            subtitle: videoInfo?.author?.name,
            description: videoInfo?.description,
            imageUri: videoInfo?.thumbnailImage?.url,
          },
        }}
        style={(style as any) ?? [styles.fullScreen, StyleSheet.absoluteFill]}
        controls={controls !== undefined ? controls : true}
        paused={paused !== undefined ? paused : !isFocused}
        fullscreen={fullscreen ?? true}
        fullscreenOrientation={"landscape"}
        repeat={repeat}
        resizeMode={resizeMode ?? ResizeMode.CONTAIN}
        chapters={parsedChapters}
        playInBackground={Platform.isTV ? undefined : true}
        pictureInPicture
        // @ts-ignore type error?
        ignoreSilentSwitch={"ignore"}
        showNotificationControls
        // Android only emits bandwidth events when asked to; iOS emits them
        // whenever a handler is set.
        reportBandwidth
        // Event listener
        onLoad={(data: any) => {
          clearStallTimer();
          LOGGER.debug(
            `Video geladen (${describeSource(videoURL)}): ` +
              `${data?.naturalSize?.width}x${data?.naturalSize?.height}, ` +
              `${data?.audioTracks?.length ?? 0} Tonspur(en)`,
          );
          reportPlaybackSize(data?.naturalSize);

          // Keep the position across a ladder step.
          if (startPositionSeconds && startPositionSeconds > 0) {
            playerRef.current?.seek?.(startPositionSeconds);
          }
        }}
        // The load event only knows the first HLS variant; adaptive switches
        // afterwards arrive here with the newly rendered size.
        onBandwidthUpdate={data => reportPlaybackSize(data)}
        onProgress={data => {
          // Playback runs — the watchdog is no longer needed.
          clearStallTimer();
          callbacks.onProgress?.(data);
        }}
        onLoadStart={() => {
          LOGGER.debug(`Video lädt… (${describeSource(videoURL)})`);
          armStallTimer();
        }}
        onError={(error: any) => {
          clearStallTimer();
          LOGGER.warn(
            `Player-Fehler (${describeSource(videoURL)}): ${JSON.stringify(error)}`,
          );
          onPlaybackFailure?.(JSON.stringify(error?.error ?? error));
        }}
        onEnd={() => {
          LOGGER.debug("End reached");
          callbacks.onEndReached?.();
        }}
      />
    </>
  );
}

/** Short source name for the log, so it is clear what actually played. */
function describeSource(uri?: string) {
  if (!uri) return "keine Quelle";
  // The self-built master arrives as a `data:` URI — AVPlayer does not accept
  // it via `file://` (see GeneratedHls.ts).
  if (uri.startsWith("data:")) return "eigenes HLS";
  if (uri.includes(".m3u8")) return "YouTube-HLS";
  return "progressiv";
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

function mapChapters(chapter: YTChapter) {
  return {
    title: chapter.title,
    startTime: chapter.startDuration,
    endTime: chapter.endDuration,
  } as Chapters;
}
