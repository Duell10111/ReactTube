import * as ScreenOrientation from "expo-screen-orientation";
import {useEffect} from "react";

// Workaround for expo screen orientation not tvOS compatible
export type Orientation = "LANDSCAPE" | "PORTRAIT" | "UNKNOWN";

export default function useOrientationChange(
  listener: (orientation: Orientation) => void,
) {
  useEffect(() => {
    const sub = ScreenOrientation.addOrientationChangeListener(state => {
      const o: Orientation = getOrientation(state.orientationInfo.orientation);
      listener(o);
    });
    return () => ScreenOrientation.removeOrientationChangeListener(sub);
  }, [listener]);
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
