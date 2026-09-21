import {useCallback, useState} from "react";
import {useWindowDimensions, type LayoutChangeEvent} from "react-native";

import {getFeedCardWidth, getFeedMetrics, type FeedMetrics} from "./feedLayout";

import {useAppChrome} from "@/ui/layout";

export interface FeedGeometry {
  metrics: FeedMetrics;
  cardWidth: number;
  onLayout: (event: LayoutChangeEvent) => void;
}

/**
 * Column count and card width of a feed. The list reports its real width, which
 * already accounts for the navigation rail, the safe areas, and split layouts;
 * the window width is only the first guess before the first layout pass.
 */
export function useFeedGeometry(): FeedGeometry {
  const {layout, railWidth, insets} = useAppChrome();
  const {width: windowWidth} = useWindowDimensions();
  const metrics = getFeedMetrics(layout);
  const [measuredWidth, setMeasuredWidth] = useState(() =>
    Math.max(0, windowWidth - railWidth - insets.left - insets.right),
  );

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const {width} = event.nativeEvent.layout;

    setMeasuredWidth(previous => (previous === width ? previous : width));
  }, []);

  return {
    metrics,
    cardWidth: getFeedCardWidth(measuredWidth, metrics),
    onLayout,
  };
}
