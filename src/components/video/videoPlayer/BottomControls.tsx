import React, {Dispatch, SetStateAction, useEffect} from "react";
import {
  ImageBackground,
  PanResponderInstance,
  StyleSheet,
  TVFocusGuideView,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import {SafeAreaView} from "react-native-safe-area-context";

import BottomContainer from "./BottomContainer";
import MetadataContainer from "./MetadataContainer";
import {NullControl} from "./NullControl";
import Seekbar from "./Seekbar";
import {Timer} from "./Timer";
import {Title} from "./Title";
import {VideoMetadata} from "./VideoPlayer";
import useAnimatedBottomControls from "./hooks/useAnimatedBottomControls";
import {useAnimations} from "./hooks/useAnimations";
import {calculateTime} from "./utils";

interface BottomControlsProps {
  animations: ReturnType<typeof useAnimations>;
  panHandlers: PanResponderInstance;
  seekColor: string;
  resetControlTimeout: () => void;
  seekerFillWidth: number;
  seekerPosition: number;
  setSeekerWidth: Dispatch<SetStateAction<number>>;
  setSeekerFocus: Dispatch<SetStateAction<boolean>>;
  toggleTimer: () => void;
  showControls: boolean;
  showDuration: boolean;
  showHours: boolean;
  paused: boolean;
  showTimeRemaining: boolean;
  currentTime: number;
  duration: number;

  // Container
  bottomContainer: React.ReactNode;

  // Metadata
  metadata: VideoMetadata;
  resolution?: string;
  onAuthorClick: () => void;
}

export default function BottomControls({
  animations,
  panHandlers,
  seekColor,
  seekerFillWidth,
  seekerPosition,
  setSeekerWidth,
  setSeekerFocus,
  resetControlTimeout,
  toggleTimer,
  showControls,
  showDuration,
  showTimeRemaining,
  showHours,
  paused,
  currentTime,
  duration,
  bottomContainer,
  metadata,
  resolution,
}: BottomControlsProps) {
  const {bottomContainerStyle, topContainerStyle, showBottomContainer} =
    useAnimatedBottomControls();

  useEffect(() => {
    if (!showControls) {
      // Use timeout to first fade out before reset
      setTimeout(() => (showBottomContainer.value = false), 200);
    }
  }, [showControls]);

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
      onFocus={() => {
        console.log("Seekder focus");
        showBottomContainer.value = false;
        setSeekerFocus(true);
      }}
      onBlur={() => {
        console.log("Seekbar blur");
        setSeekerFocus(false);
      }}
    />
  );

  return (
    <Animated.View
      style={[
        _styles.bottom,
        animations.controlsOpacity,
        animations.bottomControl,
      ]}>
      <Animated.View style={topContainerStyle}>
        <View>
          <MetadataContainer metadata={metadata} resolution={resolution} />
        </View>
        <ImageBackground
          source={require("../../../../assets/videoPlayer/bottom-vignette.png")}
          style={[styles.column]}
          imageStyle={[styles.vignette]}>
          {/*<SafeAreaView style={[styles.row, _styles.bottomControlGroup]}>*/}
          {/*  {timerControl}*/}
          {/*  /!*<Title title={title} />*!/*/}
          {/*</SafeAreaView>*/}
          <SafeAreaView style={styles.seekBarContainer}>
            {timerControl}
            <TVFocusGuideView autoFocus>{seekbarControl}</TVFocusGuideView>
          </SafeAreaView>
        </ImageBackground>
      </Animated.View>
      <Animated.View style={bottomContainerStyle}>
        <BottomContainer
          onFocus={() => {
            console.log("Bottom Focus");
            showBottomContainer.value = true;
          }}>
          {bottomContainer}
        </BottomContainer>
      </Animated.View>
    </Animated.View>
  );
}

const _styles = StyleSheet.create({
  bottom: {
    alignItems: "stretch",
    flex: 2,
    height: "40%",
    justifyContent: "flex-end",
    // backgroundColor: "red",
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
