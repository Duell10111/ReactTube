import React, {useState} from "react";
import {type LayoutChangeEvent, StyleSheet, Text, View} from "react-native";
import {Gesture, GestureDetector} from "react-native-gesture-handler";

import {
  formatPlaybackTime,
  getProgressFraction,
  getTimeForBarPosition,
} from "@/components/video/phone/phoneOverlayGestures";
import {useTranslation} from "@/localization";

/** Height of the touch area; the visible bar is only a hairline of it. */
const touchHeight = 28;

/** Step of the VoiceOver and TalkBack swipe actions. */
const accessibilityStepSeconds = 5;

interface ShortScrubberProps {
  currentSeconds: number;
  durationSeconds?: number;
  /** Distance of the bar from the bottom edge, above the home indicator. */
  bottom: number;
  onScrubbingChange: (scrubbing: boolean) => void;
  onSeek: (seconds: number) => void;
}

/**
 * Progress bar of a short that can be dragged, as in the YouTube app: a touch
 * anywhere on it grabs the position, the bar thickens and shows the target
 * time while dragging, and releasing seeks there.
 */
export function ShortScrubber({
  currentSeconds,
  durationSeconds,
  bottom,
  onScrubbingChange,
  onSeek,
}: ShortScrubberProps) {
  const {t} = useTranslation();
  const [width, setWidth] = useState(0);
  const [scrubSeconds, setScrubSeconds] = useState<number>();
  const duration = durationSeconds ?? 0;
  const timeAt = (x: number) => getTimeForBarPosition(x, width, duration);

  // A native pan, like the player's seek bar. With a JS responder, iOS's
  // full-screen back swipe won a drag towards the right and left the screen;
  // the native pan keeps it.
  const gesture = Gesture.Pan()
    .runOnJS(true)
    .enabled(duration > 0)
    // A touch on the bar jumps right away; the pan then keeps following.
    .minDistance(0)
    .onBegin(event => {
      onScrubbingChange(true);
      setScrubSeconds(timeAt(event.x));
    })
    .onUpdate(event => setScrubSeconds(timeAt(event.x)))
    .onEnd(event => onSeek(timeAt(event.x)))
    .onFinalize(() => {
      setScrubSeconds(undefined);
      onScrubbingChange(false);
    });

  const scrubbing = scrubSeconds !== undefined;
  const fraction = getProgressFraction(
    scrubSeconds ?? currentSeconds,
    duration,
  );

  return (
    <GestureDetector gesture={gesture}>
      <View
        accessibilityActions={[{name: "increment"}, {name: "decrement"}]}
        accessibilityLabel={t("video.player.seekbar")}
        accessibilityRole={"adjustable"}
        accessibilityValue={
          duration > 0
            ? {
                text: `${formatPlaybackTime(currentSeconds, duration)} / ${formatPlaybackTime(duration)}`,
              }
            : undefined
        }
        onAccessibilityAction={event => {
          if (!(duration > 0)) return;
          const step =
            event.nativeEvent.actionName === "increment"
              ? accessibilityStepSeconds
              : -accessibilityStepSeconds;
          onSeek(Math.min(Math.max(currentSeconds + step, 0), duration));
        }}
        onLayout={(event: LayoutChangeEvent) =>
          setWidth(event.nativeEvent.layout.width)
        }
        style={[styles.touch, {bottom: bottom - touchHeight / 2}]}>
        {scrubbing ? (
          <Text pointerEvents={"none"} style={styles.time}>
            {formatPlaybackTime(scrubSeconds, duration)}
            <Text style={styles.timeTotal}>
              {` / ${formatPlaybackTime(duration)}`}
            </Text>
          </Text>
        ) : null}
        <View
          pointerEvents={"none"}
          style={[styles.track, scrubbing && styles.trackScrubbing]}>
          <View style={[styles.fill, {width: `${fraction * 100}%`}]} />
        </View>
        {scrubbing ? (
          <View
            pointerEvents={"none"}
            style={[styles.thumb, {left: fraction * width - thumbSize / 2}]}
          />
        ) : null}
      </View>
    </GestureDetector>
  );
}

const thumbSize = 14;

const styles = StyleSheet.create({
  touch: {
    position: "absolute",
    left: 0,
    right: 0,
    height: touchHeight,
    justifyContent: "center",
  },
  track: {
    height: 2,
    backgroundColor: "#FFFFFF4D",
  },
  trackScrubbing: {
    height: 5,
  },
  fill: {
    height: "100%",
    backgroundColor: "white",
  },
  thumb: {
    position: "absolute",
    top: (touchHeight - thumbSize) / 2,
    width: thumbSize,
    height: thumbSize,
    borderRadius: thumbSize / 2,
    backgroundColor: "white",
  },
  time: {
    position: "absolute",
    bottom: touchHeight + 24,
    alignSelf: "center",
    color: "white",
    fontSize: 28,
    fontWeight: "700",
    textShadowColor: "#00000099",
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 4,
  },
  timeTotal: {
    color: "#FFFFFFB3",
  },
});
