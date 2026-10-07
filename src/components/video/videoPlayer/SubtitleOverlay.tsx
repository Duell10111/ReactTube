import React, {useMemo} from "react";
import {Platform, StyleSheet, Text, View} from "react-native";

import {useSubtitleCues} from "@/hooks/video/useSubtitleCues";
import {useTVOverscanInsets} from "@/ui/tv";
import {getActiveSubtitleLines, SubtitleTrack} from "@/utils/Subtitles";

interface SubtitleOverlayProps {
  track?: SubtitleTrack;
  /** Playback position in seconds. */
  currentTime: number;
  /** Moves the text above the player controls while they are visible. */
  raised: boolean;
}

/**
 * Draws the selected subtitle track above the video. White on a dark box, as
 * on YouTube, independent of the app theme: it has to stay readable on any
 * video frame.
 */
export default function SubtitleOverlay({
  track,
  currentTime,
  raised,
}: SubtitleOverlayProps) {
  const cues = useSubtitleCues(track);
  const overscan = useTVOverscanInsets();
  const timeMs = Math.round(currentTime * 1000);

  const lines = useMemo(
    () => getActiveSubtitleLines(cues, timeMs),
    [cues, timeMs],
  );

  if (!track || lines.length === 0) {
    return null;
  }

  return (
    <View
      pointerEvents={"none"}
      style={[
        styles.container,
        {
          left: overscan.left,
          right: overscan.right,
          bottom: raised ? "32%" : overscan.bottom + styles.line.fontSize,
        },
      ]}>
      {lines.map((line, index) => (
        <Text key={`${index}:${line}`} style={styles.line}>
          {line}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    alignItems: "center",
  },
  line: {
    color: "#FFFFFF",
    backgroundColor: "rgba(8, 8, 8, 0.75)",
    fontSize: Platform.isTV ? 38 : 18,
    lineHeight: Platform.isTV ? 50 : 24,
    paddingHorizontal: Platform.isTV ? 12 : 6,
    textAlign: "center",
  },
});
