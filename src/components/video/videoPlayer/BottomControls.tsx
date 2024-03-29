import {Dispatch, SetStateAction} from "react";
import {
  GestureResponderHandlers,
  ImageBackground,
  StyleSheet,
} from "react-native";
import Animated from "react-native-reanimated";
import {SafeAreaView} from "react-native-safe-area-context";

import {NullControl} from "./NullControl";
import Seekbar from "./Seekbar";
import {Timer} from "./Timer";
import {Title} from "./Title";
import {calculateTime} from "./utils";

interface BottomControlsProps {
  panHandlers: GestureResponderHandlers;
  seekColor: string;
  resetControlTimeout: () => void;
  seekerFillWidth: number;
  seekerPosition: number;
  setSeekerWidth: Dispatch<SetStateAction<number>>;
  toggleTimer: () => void;
  showControls: boolean;
  showDuration: boolean;
  showHours: boolean;
  paused: boolean;
  showTimeRemaining: boolean;
  currentTime: number;
  duration: number;
}

export default function BottomControls({
  panHandlers,
  seekColor,
  seekerFillWidth,
  seekerPosition,
  setSeekerWidth,
  resetControlTimeout,
  toggleTimer,
  showControls,
  showDuration,
  showTimeRemaining,
  showHours,
  paused,
  currentTime,
  duration,
}: BottomControlsProps) {
  const timerControl = false ? (
    <NullControl />
  ) : (
    <Timer
      resetControlTimeout={resetControlTimeout}
      toggleTimer={toggleTimer}
      showControls={showControls}>
      {calculateTime({
        showDuration,
        showHours,
        showTimeRemaining,
        time: currentTime,
        duration,
      })}
    </Timer>
  );

  const seekbarControl = false ? (
    <NullControl />
  ) : (
    <Seekbar
      seekerFillWidth={seekerFillWidth}
      seekerPosition={seekerPosition}
      seekColor={seekColor}
      seekerPanHandlers={panHandlers}
      setSeekerWidth={setSeekerWidth}
    />
  );

  return (
    <Animated.View
      style={[
        _styles.bottom,
        // animations.controlsOpacity,
        // animations.bottomControl,
      ]}>
      <ImageBackground
        source={require("../../../../assets/videoPlayer/bottom-vignette.png")}
        style={[styles.column]}
        imageStyle={[styles.vignette]}>
        {/*<SafeAreaView style={[styles.row, _styles.bottomControlGroup]}>*/}
        {/*  {timerControl}*/}
        {/*  /!*<Title title={title} />*!/*/}
        {/*</SafeAreaView>*/}
        <SafeAreaView style={styles.seekBarContainer}>
          {seekbarControl}
        </SafeAreaView>
      </ImageBackground>
    </Animated.View>
  );
}

const _styles = StyleSheet.create({
  bottom: {
    alignItems: "stretch",
    flex: 2,
    justifyContent: "flex-end",
  },
  bottomControlGroup: {
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "space-between",
    marginLeft: 12,
    marginRight: 12,
    marginBottom: 0,
    backgroundColor: "red",
  },
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  column: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-between",
  },
  vignette: {
    resizeMode: "stretch",
  },
  control: {
    padding: 16,
    opacity: 0.6,
  },
  text: {
    backgroundColor: "transparent",
    color: "#FFF",
    fontSize: 14,
    textAlign: "center",
  },
  seekBarContainer: {
    width: "100%",
  },
});
