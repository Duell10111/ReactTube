import {Dispatch, SetStateAction, useState} from "react";
import {PanResponderInstance, Pressable, StyleSheet, View} from "react-native";

import {useAppTheme} from "@/ui/theme";

interface SeekbarProps {
  seekerFillWidth: number;
  seekerPosition: number;
  seekColor: string;
  seekerPanHandlers: PanResponderInstance;
  setSeekerWidth: Dispatch<SetStateAction<number>>;
  onFocus?: () => void;
  onBlur?: () => void;
}

const handleSize = 32;

/**
 * Playback progress. The fill is the media progress colour every surface uses
 * for watch progress, so the bar in the player and the bar on a card mean the
 * same thing.
 */
export default function Seekbar({
  seekColor,
  seekerFillWidth,
  seekerPosition,
  seekerPanHandlers,
  setSeekerWidth,
  onFocus,
  onBlur,
}: SeekbarProps) {
  const {theme, reduceMotion} = useAppTheme();
  const [focused, setFocused] = useState(false);
  const fillColor = seekColor || theme.colors.mediaProgress;

  return (
    <View
      collapsable={false}
      style={[styles.container, {marginHorizontal: theme.spacing.xl}]}
      {...seekerPanHandlers}>
      <View
        onLayout={event => setSeekerWidth(event.nativeEvent.layout.width)}
        pointerEvents={"none"}
        style={[styles.track, {backgroundColor: theme.colors.divider}]}>
        <View
          pointerEvents={"none"}
          style={[
            styles.fill,
            {width: seekerFillWidth, backgroundColor: fillColor},
          ]}
        />
      </View>
      <View
        pointerEvents={"none"}
        style={[styles.handle, {left: seekerPosition}]}>
        <Pressable
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          onFocus={() => {
            setFocused(true);
            onFocus?.();
          }}>
          <View
            pointerEvents={"none"}
            style={[
              styles.circle,
              {
                backgroundColor: fillColor,
                borderColor: focused
                  ? theme.colors.focus
                  : theme.colors.focusResting,
              },
              focused && !reduceMotion && styles.circleFocused,
            ]}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "stretch",
    height: 28,
  },
  track: {
    height: 5,
    position: "relative",
    top: 14,
    width: "100%",
  },
  fill: {
    height: 5,
    width: "100%",
  },
  handle: {
    position: "absolute",
    marginLeft: -7,
    height: handleSize,
    width: handleSize,
  },
  circle: {
    borderRadius: 12,
    borderWidth: 3,
    position: "relative",
    top: 6,
    left: -5,
    height: 20,
    width: 20,
  },
  circleFocused: {
    transform: [{scale: 1.3}],
  },
});
