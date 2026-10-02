import {useIsFocused} from "@react-navigation/native";
import React, {Dispatch, SetStateAction, useEffect, useRef} from "react";
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
  setPaused: Dispatch<SetStateAction<boolean>>;
  onSeekbarPress: () => void;
  /**
   * Whether hiding the controls may pull focus back onto the seek bar. Off
   * while something else, like the end card, holds the focus.
   */
  restoreFocusOnHide: boolean;
  showTimeRemaining: boolean;
  currentTime: number;
  duration: number;

  // Container
  bottomContainer: React.ReactNode;

  // Metadata
  metadata: VideoMetadata;
  resolution?: string;
  onJumpToStart: () => void;
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
  setPaused,
  onSeekbarPress,
  restoreFocusOnHide,
  currentTime,
  duration,
  bottomContainer,
  metadata,
  resolution,
  onJumpToStart,
}: BottomControlsProps) {
  const {bottomContainerStyle, topContainerStyle, showBottomContainer} =
    useAnimatedBottomControls();
  const seekbarHandleRef = useRef<View>(null);
  // A transparent modal on top owns the focus; pulling it back here would
  // strand the remote behind the modal.
  const screenFocused = useIsFocused();
  const canRestoreFocus = restoreFocusOnHide && screenFocused;

  useEffect(() => {
    if (showControls) {
      return;
    }
    // Let the controls fade out before the panel slides back down, and drop
    // the timer if they come back in the meantime — an uncleared one used to
    // collapse the panel right after it was reopened.
    const timeout = setTimeout(() => {
      showBottomContainer.value = false;
      // Focus used to stay on whatever control was last used, now invisible.
      // The next Select then reloaded the video or opened a related one
      // without the user seeing what was focused. Parking it on the seek bar
      // makes a hidden overlay respond to Select and left/right predictably.
      if (canRestoreFocus) {
        seekbarHandleRef.current?.requestTVFocus?.();
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [showControls, showBottomContainer, canRestoreFocus]);

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
      handleRef={seekbarHandleRef}
      onPress={onSeekbarPress}
      onFocus={() => {
        // console.log("Seekder focus");
        showBottomContainer.value = false;
        setSeekerFocus(true);
      }}
      onBlur={() => {
        // console.log("Seekbar blur");
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
          <MetadataContainer
            metadata={metadata}
            resolution={resolution}
            pause={() => setPaused(true)}
            onJumpToStart={onJumpToStart}
            // Every control above the panel collapses it. Only the seek handle
            // did before, so reaching the action buttons from the related
            // videos left the panel covering the lower half of the screen for
            // the rest of the video.
            onControlFocus={() => {
              showBottomContainer.value = false;
            }}
          />
        </View>
        <ImageBackground
          source={require("../../../../assets/videoPlayer/bottom-vignette.png")}
          style={[styles.column]}
          imageStyle={[styles.vignette]}>
          <SafeAreaView style={styles.seekBarContainer}>
            {timerControl}
            {/* While the controls are hidden, focus stays on the seek bar, so
             * the first press only reveals them instead of moving through
             * controls nobody can see. Left and right always seek here, so
             * they never move focus off the bar.
             *
             * No `hasTVPreferredFocus` on reveal: hiding already parks focus
             * on the bar, and requesting focus for this container made tvOS
             * resolve it to the last focused related video instead, so the
             * next left/right scrolled that list rather than seeking. */}
            <TVFocusGuideView
              autoFocus
              trapFocusUp={!showControls}
              trapFocusDown={!showControls}
              trapFocusLeft
              trapFocusRight>
              {seekbarControl}
            </TVFocusGuideView>
          </SafeAreaView>
        </ImageBackground>
      </Animated.View>
      <Animated.View style={bottomContainerStyle}>
        <BottomContainer
          onFocus={() => {
            // console.log("Bottom Focus");
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
