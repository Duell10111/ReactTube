import {Duration} from "luxon";
import {StyleSheet, View} from "react-native";
import {Slider} from "react-native-awesome-slider";
import {
  runOnJS,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
import {ReText} from "react-native-redash";

import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {useAppTheme} from "@/ui/theme";

export function MusicPlayerSlider() {
  const {currentTime, duration, seek} = useMusikPlayerContext();
  const {theme} = useAppTheme();

  const min = useSharedValue(0);
  const currentProgressString = useSharedValue("");
  const durationString = useSharedValue("");

  const parseProgress = (seconds: number) => {
    currentProgressString.value = secondsToReadableString(seconds);
  };

  useDerivedValue(() => {
    return runOnJS(parseProgress)(currentTime.value);
  }, [currentTime]);

  const parseDuration = (seconds: number) => {
    durationString.value = secondsToReadableString(seconds);
  };

  useDerivedValue(() => {
    return runOnJS(parseDuration)(duration.value);
  }, [duration]);

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
      <ReText
        style={[styles.currentTimeStyle, {color: theme.colors.textSecondary}]}
        text={currentProgressString}
      />
      <ReText
        style={[styles.durationTimeStyle, {color: theme.colors.textSecondary}]}
        text={durationString}
      />
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
