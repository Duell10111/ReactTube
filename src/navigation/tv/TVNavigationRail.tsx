import {MaterialIcons} from "@expo/vector-icons";
import React, {forwardRef} from "react";
import {Pressable, StyleSheet, View} from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";

import {useTranslation} from "@/localization";
import {AppText} from "@/ui/components";
import {tvRailMetrics} from "@/ui/layout";
import type {TVRailDestination} from "@/ui/navigation";
import {spacing, useAppTheme} from "@/ui/theme";

interface TVRailItemProps {
  destination: TVRailDestination;
  selected: boolean;
  focused: boolean;
  railWidth: SharedValue<number>;
  onFocus: () => void;
  onBlur: () => void;
  onPress: () => void;
}

/**
 * A rail destination stretches to the current rail width, so its focusable
 * frame never reaches into the content plane and is never clipped away.
 * Selected and focused are rendered as separate states: selection stays visible
 * while the rail is collapsed, focus adds the outline.
 */
export const TVRailItem = forwardRef<View, TVRailItemProps>(
  (
    {destination, selected, focused, railWidth, onFocus, onBlur, onPress},
    ref,
  ) => {
    const {theme} = useAppTheme();
    const {t} = useTranslation();
    const label = t(destination.labelKey);

    const labelStyle = useAnimatedStyle(() => ({
      opacity: interpolate(
        railWidth.value,
        [tvRailMetrics.collapsedWidth, tvRailMetrics.expandedWidth],
        [0, 1],
        "clamp",
      ),
    }));

    return (
      <Pressable
        accessibilityLabel={label}
        accessibilityRole={"tab"}
        accessibilityState={{selected}}
        onBlur={onBlur}
        onFocus={onFocus}
        onPress={onPress}
        ref={ref}
        style={[
          styles.item,
          {
            height: tvRailMetrics.itemHeight,
            borderColor: focused
              ? theme.colors.focus
              : theme.colors.focusResting,
            borderRadius: theme.radii.control,
            backgroundColor: focused
              ? theme.colors.surfacePressed
              : selected
                ? theme.colors.surfaceRaised
                : theme.colors.focusResting,
          },
        ]}>
        <View
          style={[
            styles.indicator,
            {
              backgroundColor: selected
                ? theme.colors.brand
                : theme.colors.focusResting,
              borderRadius: theme.radii.round,
            },
          ]}
        />
        <MaterialIcons
          color={
            selected || focused
              ? theme.colors.textPrimary
              : theme.colors.textSecondary
          }
          name={destination.icon}
          size={32}
        />
        <Animated.View style={[styles.labelContainer, labelStyle]}>
          <AppText
            color={selected || focused ? "textPrimary" : "textSecondary"}
            numberOfLines={1}
            variant={"titleSmall"}>
            {label}
          </AppText>
        </Animated.View>
      </Pressable>
    );
  },
);

TVRailItem.displayName = "TVRailItem";

const styles = StyleSheet.create({
  item: {
    // No fixed width: the item inherits the animated rail width.
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: tvRailMetrics.focusBorderWidth,
    paddingStart: spacing.sm,
  },
  indicator: {
    width: tvRailMetrics.selectionIndicatorWidth,
    height: "50%",
    marginEnd: spacing.md,
  },
  labelContainer: {
    flex: 1,
    marginStart: spacing.lg,
  },
});
