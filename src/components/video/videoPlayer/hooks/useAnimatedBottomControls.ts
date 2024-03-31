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

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
      console.log("Y: ", event.contentOffset.y);
      // scrollY.value = event.contentOffset.y;
      showBottomContainer.value = event.contentOffset.y > 10;
    },
  });

  const topContainerStyle = useAnimatedStyle(() => {
    return {
      // position: "absolute",
      // bottom: withTiming(showBottomContainer.value ? 472 : 120),
      // // bottom: withTiming(showBottomContainer.value ? 800 : 120),
      // // bottom: 600,
      // left: 0,
      // right: 0,
      transform: [
        {translateY: withTiming(showBottomContainer.value ? 0 : 300)},
      ],
      // opacity: withTiming(showBottomContainer.value ? 0.1 : 1),
      opacity: 1,
      zIndex: -1,
      // backgroundColor: "yellow",
    };
  });

  const bottomContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {translateY: withTiming(showBottomContainer.value ? 0 : 300)},
      ],
      height: "45%",
      // position: "absolute",
      // left: 0,
      // right: 0,
      // bottom: withTiming(showBottomContainer.value ? 0 : -350),
      // opacity: 0,
    };
  });

  console.log(showBottomContainer.value);

  return {
    scrollHandler,
    showBottomContainer,
    topContainerStyle,
    bottomContainerStyle,
  };
}
