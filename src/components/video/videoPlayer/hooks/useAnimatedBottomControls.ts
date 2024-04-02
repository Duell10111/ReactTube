import {useWindowDimensions} from "react-native";
import {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export default function useAnimatedBottomControls() {
  const {height} = useWindowDimensions();

  const showBottomContainer = useSharedValue(false);

  const topContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {translateY: withTiming(showBottomContainer.value ? 0 : 300)},
      ],
      opacity: 1,
      zIndex: -1,
    };
  });

  const bottomContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {translateY: withTiming(showBottomContainer.value ? 0 : 300)},
      ],
      height: "45%",
    };
  });

  return {
    showBottomContainer,
    topContainerStyle,
    bottomContainerStyle,
  };
}
