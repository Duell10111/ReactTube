import React, {useEffect, useRef} from "react";
import {
  Animated,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import {useAppTheme} from "@/ui/theme";

interface SkeletonProps {
  width?: ViewStyle["width"];
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Skeleton({
  width = "100%",
  height,
  radius,
  style,
  accessibilityLabel,
}: SkeletonProps) {
  const {theme, reduceMotion} = useAppTheme();
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(0.65);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: theme.motion.duration.deliberate * 2,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: theme.motion.duration.deliberate * 2,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [opacity, reduceMotion, theme.motion.duration.deliberate]);

  return (
    <Animated.View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityLabel ? "progressbar" : undefined}
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius: radius ?? theme.radii.control,
          backgroundColor: theme.colors.surfacePressed,
          opacity,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: "hidden",
  },
});
