import * as ScreenOrientation from "expo-screen-orientation";
import {useLayoutEffect} from "react";
import {useWindowDimensions} from "react-native";

// Workaround for expo screen orientation not tvOS compatible
export type Orientation = "LANDSCAPE" | "PORTRAIT" | "UNKNOWN";

export default function useOrientationChange(
  listener: (orientation: Orientation) => void,
) {
  const {height, width} = useWindowDimensions();

  // // Return orientation on start once
  // useEffect(() => {
  //   ScreenOrientation.getOrientationAsync().then(state => {
  //     const o = getOrientation(state);
  //     listener(o);
  //   });
  // }, []);
  //
  // useEffect(() => {
  //   const sub = ScreenOrientation.addOrientationChangeListener(state => {
  //     const o: Orientation = getOrientation(state.orientationInfo.orientation);
  //     listener(o);
  //   });
  //   return () => ScreenOrientation.removeOrientationChangeListener(sub);
  // }, [listener]);

  // Workaround as Expo Lib seems broken on iOS
  useLayoutEffect(() => {
    return height > width ? listener("PORTRAIT") : listener("LANDSCAPE");
  }, [width, height]);
}

function getOrientation(
  orientation: ScreenOrientation.Orientation,
): Orientation {
  switch (orientation) {
    case ScreenOrientation.Orientation.PORTRAIT_UP:
    case ScreenOrientation.Orientation.PORTRAIT_DOWN:
      return "PORTRAIT";
    case ScreenOrientation.Orientation.LANDSCAPE_RIGHT:
    case ScreenOrientation.Orientation.LANDSCAPE_LEFT:
      return "LANDSCAPE";
    default:
      return "UNKNOWN";
  }
}
