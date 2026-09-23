import React from "react";
import {
  Platform,
  TVFocusGuideView,
  View,
  type ViewProps,
  type ViewStyle,
  type StyleProp,
} from "react-native";

interface TVFocusRegionProps {
  children: React.ReactNode;
  /**
   * Whether the region claims focus when it is first reached and returns it to
   * the child that had it on every later visit. This is what gives a screen an
   * initial focus target and what restores focus after a detour, so it is on
   * by default — a region that does not manage focus is not worth declaring.
   */
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: ViewProps["accessibilityLabel"];
}

/**
 * One focus region of a screen. On TV it is a focus guide, which owns both the
 * initial focus and the memory of the last focused child; everywhere else it is
 * a plain view, so a surface can declare its focus graph once instead of
 * branching on `Platform.isTV` at every level.
 *
 * Regions are meant to be siblings, not nested: a guide that spans a whole
 * screen competes with every move made inside it, which is why the TV side
 * panel deliberately gives each of its rows a region of its own rather than
 * wrapping the panel in one.
 */
export function TVFocusRegion({
  children,
  autoFocus = true,
  style,
  testID,
  accessibilityLabel,
}: TVFocusRegionProps) {
  if (!Platform.isTV) {
    return (
      <View
        accessibilityLabel={accessibilityLabel}
        style={style}
        testID={testID}>
        {children}
      </View>
    );
  }

  return (
    <TVFocusGuideView
      accessibilityLabel={accessibilityLabel}
      autoFocus={autoFocus}
      style={style}
      testID={testID}>
      {children}
    </TVFocusGuideView>
  );
}
