import {MaterialIcons} from "@expo/vector-icons";
import {Image} from "expo-image";
import React from "react";
import {Pressable, StyleSheet, Text, View} from "react-native";
import Svg, {Circle} from "react-native-svg";

import {AUTOPLAY_COUNTDOWN_SECONDS, UpNextVideo} from "./phoneAutoplayModel";

import {useAutoplayCountdown} from "@/hooks/ui/useAutoplayCountdown";
import useVideoElementData from "@/hooks/video/useVideoElementData";
import {useTranslation} from "@/localization";

const CONTROL_COLOR = "#FFFFFF";
const RING_SIZE = 56;
const RING_STROKE = 3;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

interface PhoneUpNextOverlayProps {
  upNext: UpNextVideo;
  onPlay: () => void;
  onCancel: () => void;
}

/**
 * YouTube's autoplay screen after a video: the next title over its own
 * thumbnail, "Up next in 5", and a play button whose ring runs out with the
 * countdown. Cancel leaves the ended video with its replay button.
 *
 * The parent mounts it once per ended video, so every pass gets a fresh
 * countdown.
 */
export default function PhoneUpNextOverlay({
  upNext,
  onPlay,
  onCancel,
}: PhoneUpNextOverlayProps) {
  const {t} = useTranslation();
  // Only fetched when neither the playlist nor the feed knew the video.
  const {videoElement} = useVideoElementData(
    upNext.title ? undefined : (upNext.navEndpoint ?? upNext.videoId),
  );
  const title = upNext.title ?? videoElement?.title;
  const author = upNext.author ?? videoElement?.author?.name;
  const thumbnailUrl = upNext.thumbnailUrl ?? videoElement?.thumbnailImage?.url;

  const {remainingSeconds, progress, cancel} = useAutoplayCountdown({
    totalSeconds: AUTOPLAY_COUNTDOWN_SECONDS,
    enabled: true,
    onElapsed: onPlay,
  });

  return (
    <View style={styles.root}>
      {thumbnailUrl ? (
        <Image
          contentFit={"cover"}
          source={{uri: thumbnailUrl}}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={styles.scrim} />
      <View style={styles.content}>
        <Text style={styles.label}>
          {t("video.upNext.in", {seconds: remainingSeconds})}
        </Text>
        {title ? (
          <Text numberOfLines={2} style={styles.title}>
            {title}
          </Text>
        ) : null}
        {author ? (
          <Text numberOfLines={1} style={styles.author}>
            {author}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <Pressable
            accessibilityRole={"button"}
            hitSlop={8}
            onPress={() => {
              cancel();
              onCancel();
            }}
            style={styles.cancel}>
            <Text style={styles.cancelText}>{t("common.cancel")}</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={t("video.upNext.playNow")}
            accessibilityRole={"button"}
            hitSlop={8}
            onPress={() => {
              cancel();
              onPlay();
            }}
            style={styles.play}>
            <Svg
              height={RING_SIZE}
              style={StyleSheet.absoluteFill}
              width={RING_SIZE}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                fill={"rgba(0, 0, 0, 0.4)"}
                r={RING_RADIUS}
                stroke={"rgba(255, 255, 255, 0.3)"}
                strokeWidth={RING_STROKE}
              />
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                fill={"none"}
                r={RING_RADIUS}
                stroke={CONTROL_COLOR}
                strokeDasharray={`${RING_LENGTH} ${RING_LENGTH}`}
                strokeDashoffset={RING_LENGTH * (1 - progress)}
                strokeLinecap={"round"}
                strokeWidth={RING_STROKE}
                // Starts at twelve o'clock and runs clockwise.
                transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
              />
            </Svg>
            <MaterialIcons
              color={CONTROL_COLOR}
              name={"play-arrow"}
              size={34}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "black",
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 4,
  },
  label: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 13,
  },
  title: {
    color: CONTROL_COLOR,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  author: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 13,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 32,
    marginTop: 10,
  },
  cancel: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelText: {
    color: CONTROL_COLOR,
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  play: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
});
