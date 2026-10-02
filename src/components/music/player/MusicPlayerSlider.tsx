import {Duration} from "luxon";
import {useState} from "react";
import {StyleSheet, Text, View} from "react-native";
import {Slider} from "react-native-awesome-slider";
import {
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
} from "react-native-reanimated";

import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {useAppTheme} from "@/ui/theme";

export function MusicPlayerSlider() {
  const {currentTime, duration, seek} = useMusikPlayerContext();
  const {theme} = useAppTheme();

  const min = useSharedValue(0);
  // Plain React state instead of ReText: ReText re-commits its mount-time value
  // whenever this component re-renders (e.g. on play/pause), which wiped the
  // natively-set duration label because the duration rarely changes afterwards.
  const [currentSeconds, setCurrentSeconds] = useState(() =>
    Math.floor(currentTime.value),
  );
  const [durationSeconds, setDurationSeconds] = useState(() =>
    Math.floor(duration.value),
  );

  // Only cross to JS when the displayed whole second changes.
  useAnimatedReaction(
    () => Math.floor(currentTime.value),
    (seconds, previous) => {
      if (seconds !== previous) {
        runOnJS(setCurrentSeconds)(seconds);
      }
    },
    [currentTime],
  );

  useAnimatedReaction(
    () => Math.floor(duration.value),
    (seconds, previous) => {
      if (seconds !== previous) {
        runOnJS(setDurationSeconds)(seconds);
      }
    },
    [duration],
  );

  return (
    <View>
      <Slider
        style={{flex: 0, height: 50}}
        progress={currentTime}
        minimumValue={min}
        maximumValue={duration}
        bubble={seconds => {
          const dur = Duration.fromObject({seconds});
          return dur.toFormat("mm:ss");
        }}
        disableTrackFollow
        theme={{
          bubbleBackgroundColor: theme.colors.surfacePressed,
          maximumTrackTintColor: theme.colors.divider,
          minimumTrackTintColor: theme.colors.mediaProgress,
        }}
        onSlidingComplete={seconds => {
          // console.log(`Slide to ${seconds}`);
          seek(seconds);
        }}
      />
      <Text
        style={[styles.currentTimeStyle, {color: theme.colors.textSecondary}]}>
        {secondsToReadableString(currentSeconds)}
      </Text>
      <Text
        style={[styles.durationTimeStyle, {color: theme.colors.textSecondary}]}>
        {secondsToReadableString(durationSeconds)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  sliderStyle: {
    flex: 0,
    height: 50,
  },
  currentTimeStyle: {
    position: "absolute",
    left: 0,
    bottom: 0,
  },
  durationTimeStyle: {
    position: "absolute",
    right: 0,
    bottom: 0,
  },
});

function secondsToReadableString(seconds: number) {
  const dur = Duration.fromObject({seconds});
  return dur.toFormat("mm:ss");
}
