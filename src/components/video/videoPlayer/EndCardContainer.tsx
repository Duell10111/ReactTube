import React from "react";
import {StyleSheet} from "react-native";
import Animated, {
  SharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

interface EndCardContainerProps {
  children: React.ReactNode;
  showEndCard: SharedValue<boolean>;
}

export default function EndCardContainer({
  children,
  showEndCard,
}: EndCardContainerProps) {
  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(showEndCard.value ? 1 : 0),
    };
  });

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
