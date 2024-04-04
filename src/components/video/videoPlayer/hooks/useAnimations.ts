import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from "react-native-reanimated";

export const useAnimations = (controlAnimationTiming: number) => {
  const bottomControlMarginBottom = useSharedValue(0);
  const opacity = useSharedValue(1);
  const topControlMarginTop = useSharedValue(0);
  const showEndCard = useSharedValue(false);

  const bottomControl = useAnimatedStyle(() => {
    return {
      transform: [{translateY: bottomControlMarginBottom.value}],
    };
  });

  const topControl = useAnimatedStyle(() => {
    return {
      transform: [{translateY: topControlMarginTop.value}],
    };
  });

  const controlsOpacity = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const hideControlAnimation = () => {
    console.log("Hide Control");
    bottomControlMarginBottom.value = withTiming(100, {
      duration: controlAnimationTiming,
    });
    topControlMarginTop.value = withTiming(-100, {
      duration: controlAnimationTiming,
    });
    opacity.value = withTiming(0, {
      duration: controlAnimationTiming,
    });
  };

  const showControlAnimation = () => {
    console.log("Show Control");
    bottomControlMarginBottom.value = withTiming(0, {
      duration: controlAnimationTiming,
    });
    topControlMarginTop.value = withTiming(0, {
      duration: controlAnimationTiming,
    });
    opacity.value = withTiming(1, {
      duration: controlAnimationTiming,
    });
    showEndCard.value = false;
  };

  const animations = {
    bottomControl,
    topControl,
    controlsOpacity,
    hideControlAnimation,
    showControlAnimation,
    AnimatedView: Animated.View,
    showEndCard,
  };

  return animations;
};
