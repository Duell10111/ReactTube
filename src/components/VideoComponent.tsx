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

const LOGGER = Logger.extend("VIDEO");

/**
 * So lange darf ein Ladevorgang ohne Ergebnis bleiben, bevor die Quelle als
 * gescheitert gilt. Großzügig bemessen: eine langsame Leitung soll nicht
 * fälschlich eine Stufe kosten, ein toter Decoder aber auch nicht ewig hängen.
 */
const STALL_TIMEOUT_MS = 20_000;

interface Props {
  /**
   * Die Quelle, die gerade gilt.
   *
   * Welche das ist, entscheidet die Ladder in `useVideoDetails` (Plan-Phase
   * 4.1) — dieser Player spielt sie nur und meldet zurück, wenn sie nicht
   * trägt. Bis Phase 2c stand hier eine zweite Quelle (`hlsUrl ?? url`), die
   * die gewählte verdrängte; der Fehler kostete einen ganzen Gerätelauf.
   */
  url: string;
  /** Position, an der eingestiegen wird — trägt die Stelle über einen Stufenwechsel. */
  startPositionSeconds?: number;
  /**
   * Meldet, dass diese Quelle nicht trägt: als Fehler oder als Stillstand.
   * Die Ladder entscheidet, was daraus folgt.
   */
  onPlaybackFailure?: (reason: string) => void;
  style?: StyleProp<ViewStyle>;
  videoInfo?: YTVideoInfo;
  chapters?: YTChapter[];
  fullscreen?: boolean;
  onEndReached?: () => void;
  onPlaybackInfoUpdate?: (playbackInfos: {
    width: number;
    height: number;
  }) => void;
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
   * Stillstands-Wächter — Plan-Phase 4.1.
   *
   * **Warum `onError` nicht genügt:** fehlt dem Gerät der Decoder, meldet
   * AVPlayer keinen Fehler. Gemessen mit einem Manifest, das nur AV1 anbot,
   * starb der Media-Server-Prozess, `onLoad` kam nie, `onError` auch nicht —
   * für den Benutzer ein Ladebalken ohne Ende. Bleibt das Laden also zu lange
   * ohne Ergebnis, gilt die Quelle als gescheitert.
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

  // Ein Quellenwechsel räumt den Wächter ab; der neue Ladevorgang bewaffnet ihn.
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
        // Event listener
        onLoad={(data: any) => {
          clearStallTimer();
          LOGGER.debug(
            `Video geladen (${describeSource(videoURL)}): ` +
              `${data?.naturalSize?.width}x${data?.naturalSize?.height}, ` +
              `${data?.audioTracks?.length ?? 0} Tonspur(en)`,
          );
          callbacks.onPlaybackInfoUpdate?.({
            width: data?.naturalSize?.width,
            height: data?.naturalSize?.height,
          });

          // Die Stelle über einen Stufenwechsel hinweg halten.
          if (startPositionSeconds && startPositionSeconds > 0) {
            playerRef.current?.seek?.(startPositionSeconds);
          }
        }}
        onProgress={data => {
          // Es läuft — der Wächter wird nicht mehr gebraucht.
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

/** Kurzname der Quelle fürs Protokoll — damit erkennbar ist, was wirklich lief. */
function describeSource(uri?: string) {
  if (!uri) return "keine Quelle";
  if (uri.startsWith("file://")) return "eigenes HLS";
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
