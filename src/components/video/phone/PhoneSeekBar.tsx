import {Image} from "expo-image";
import React, {useMemo, useState} from "react";
import {StyleSheet, Text, View} from "react-native";
import {Gesture, GestureDetector} from "react-native-gesture-handler";

import {
  formatPlaybackTime,
  getProgressFraction,
  getTimeForBarPosition,
} from "./phoneOverlayGestures";
import {
  getChapterSegments,
  getPreviewLeft,
  getSegmentFill,
} from "./phoneSeekBarModel";

import {findActiveChapterIndex} from "@/components/video/tv/chapterModel";
import type {YTChapter} from "@/extraction/Types";
import {getStoryboardFrame, YTStoryboard} from "@/extraction/storyboard";
import {useTranslation} from "@/localization";

const PROGRESS_COLOR = "#FF0000";
const CONTROL_COLOR = "#FFFFFF";
const TRACK_COLOR = "rgba(255, 255, 255, 0.3)";
const BUFFER_COLOR = "rgba(255, 255, 255, 0.5)";

/** Gap between two chapter segments, as on YouTube. */
const CHAPTER_GAP = 2;

/** Width of the preview frame; the height follows the storyboard. */
const PREVIEW_WIDTH = 160;

interface PhoneSeekBarProps {
  duration: number;
  currentTime: number;
  bufferedTime: number;
  chapters?: YTChapter[];
  storyboard?: YTStoryboard;
  /** The time under the finger while scrubbing, otherwise `undefined`. */
  scrubTime?: number;
  onScrub: (seconds: number | undefined) => void;
  onSeek: (seconds: number) => void;
  /** The controls are visible: the bar grows and shows its thumb. */
  active: boolean;
  fullscreen: boolean;
  /** Safe area to keep clear in full screen. */
  insetLeft: number;
  insetRight: number;
}

/**
 * The red bar of the phone player. It is split at the chapters, shows the
 * buffered range, and while scrubbing shows a storyboard frame with the time
 * and chapter above the finger.
 */
export default function PhoneSeekBar({
  duration,
  currentTime,
  bufferedTime,
  chapters,
  storyboard,
  scrubTime,
  onScrub,
  onSeek,
  active,
  fullscreen,
  insetLeft,
  insetRight,
}: PhoneSeekBarProps) {
  const {t} = useTranslation();
  const [barWidth, setBarWidth] = useState(0);
  const scrubbing = scrubTime !== undefined;
  const displayedTime = scrubTime ?? currentTime;
  const progress = getProgressFraction(displayedTime, duration);

  const segments = useMemo(
    () => getChapterSegments(chapters, duration),
    [chapters, duration],
  );

  const gesture = Gesture.Pan()
    .runOnJS(true)
    // A touch on the bar jumps right away; the pan then keeps following.
    .minDistance(0)
    .onBegin(event =>
      onScrub(getTimeForBarPosition(event.x, barWidth, duration)),
    )
    .onUpdate(event =>
      onScrub(getTimeForBarPosition(event.x, barWidth, duration)),
    )
    .onEnd(event => onSeek(getTimeForBarPosition(event.x, barWidth, duration)))
    .onFinalize(() => onScrub(undefined));

  const chapterIndex = chapters?.length
    ? findActiveChapterIndex(chapters, displayedTime)
    : -1;
  const chapterTitle =
    chapterIndex >= 0 ? chapters?.[chapterIndex]?.title : undefined;

  const previewHeight = storyboard
    ? Math.round(
        (PREVIEW_WIDTH * storyboard.thumbnailHeight) /
          storyboard.thumbnailWidth,
      )
    : 0;
  const frame =
    scrubbing && storyboard
      ? getStoryboardFrame(storyboard, displayedTime, duration)
      : undefined;

  const timeLabel = `${formatPlaybackTime(displayedTime, duration)} / ${formatPlaybackTime(duration)}`;

  return (
    <GestureDetector gesture={gesture}>
      <View
        accessibilityLabel={t("video.player.seekbar")}
        accessibilityRole={"adjustable"}
        accessibilityValue={{
          min: 0,
          max: Math.round(duration),
          now: Math.round(displayedTime),
          text: chapterTitle ? `${timeLabel}, ${chapterTitle}` : timeLabel,
        }}
        onLayout={event => setBarWidth(event.nativeEvent.layout.width)}
        style={[
          styles.touchArea,
          fullscreen && styles.touchAreaFullscreen,
          fullscreen && {left: insetLeft + 16, right: insetRight + 16},
          !active && fullscreen && styles.hidden,
        ]}>
        <View
          style={[
            styles.track,
            active && styles.trackActive,
            !active && styles.trackHidden,
          ]}>
          {segments.map((segment, index) => (
            <View
              key={segment.startSeconds}
              style={[
                styles.segment,
                {
                  left: `${segment.startFraction * 100}%`,
                  width: `${segment.widthFraction * 100}%`,
                },
              ]}>
              <View
                style={[
                  styles.segmentInner,
                  // The last segment runs to the end; the others leave a gap.
                  index < segments.length - 1 && {marginRight: CHAPTER_GAP},
                  // The segment under the finger grows, as on YouTube.
                  scrubbing &&
                    index === Math.max(0, chapterIndex) &&
                    segments.length > 1 &&
                    styles.segmentScrubbed,
                ]}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${getSegmentFill(segment, bufferedTime) * 100}%`,
                      backgroundColor: BUFFER_COLOR,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${getSegmentFill(segment, displayedTime) * 100}%`,
                      backgroundColor: PROGRESS_COLOR,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
        {active ? (
          <View
            pointerEvents={"none"}
            style={[
              styles.thumb,
              scrubbing && styles.thumbActive,
              {left: `${progress * 100}%`},
            ]}
          />
        ) : null}
        {scrubbing ? (
          <View
            pointerEvents={"none"}
            style={[
              styles.preview,
              {
                width: PREVIEW_WIDTH,
                left: getPreviewLeft(progress, barWidth, PREVIEW_WIDTH),
              },
            ]}>
            {storyboard && frame ? (
              <View
                style={[
                  styles.previewFrame,
                  {width: PREVIEW_WIDTH, height: previewHeight},
                ]}>
                <Image
                  cachePolicy={"memory-disk"}
                  contentFit={"fill"}
                  source={{uri: frame.url}}
                  style={{
                    position: "absolute",
                    width: PREVIEW_WIDTH * storyboard.columns,
                    height: previewHeight * storyboard.rows,
                    left: -frame.column * PREVIEW_WIDTH,
                    top: -frame.row * previewHeight,
                  }}
                />
              </View>
            ) : null}
            {chapterTitle ? (
              <Text numberOfLines={1} style={styles.previewChapter}>
                {chapterTitle}
              </Text>
            ) : null}
            <Text style={styles.previewTime}>
              {formatPlaybackTime(displayedTime, duration)}
            </Text>
          </View>
        ) : null}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  touchArea: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -12,
    height: 28,
    justifyContent: "center",
  },
  touchAreaFullscreen: {
    bottom: 12,
  },
  hidden: {
    opacity: 0,
  },
  track: {
    height: 3,
  },
  trackActive: {
    height: 4,
  },
  trackHidden: {
    height: 2,
  },
  segment: {
    position: "absolute",
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  segmentInner: {
    flex: 1,
    backgroundColor: TRACK_COLOR,
    overflow: "hidden",
  },
  segmentScrubbed: {
    transform: [{scaleY: 2}],
  },
  fill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
  },
  thumb: {
    position: "absolute",
    width: 12,
    height: 12,
    marginLeft: -6,
    borderRadius: 6,
    backgroundColor: PROGRESS_COLOR,
  },
  thumbActive: {
    width: 18,
    height: 18,
    marginLeft: -9,
    borderRadius: 9,
  },
  preview: {
    position: "absolute",
    bottom: 26,
    alignItems: "center",
    gap: 2,
  },
  previewFrame: {
    overflow: "hidden",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: CONTROL_COLOR,
    backgroundColor: "black",
  },
  previewChapter: {
    color: CONTROL_COLOR,
    fontSize: 12,
    fontWeight: "600",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowRadius: 3,
  },
  previewTime: {
    color: CONTROL_COLOR,
    fontSize: 13,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowRadius: 3,
  },
});
