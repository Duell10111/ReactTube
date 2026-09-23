import {useCallback, useState} from "react";
import {useWindowDimensions, type LayoutChangeEvent} from "react-native";

import {
  getFeedCardWidth,
  getFeedContentPadding,
  getFeedLayoutClass,
  getFeedMetrics,
  type FeedContentPadding,
  type FeedMetrics,
} from "./feedLayout";
import {getFeedListPerformance, type ListPerformance} from "./feedPerformance";

import {useAppChrome} from "@/ui/layout";

export interface FeedGeometry {
  metrics: FeedMetrics;
  cardWidth: number;
  /** Padding of the scroll content, including the TV overscan margin. */
  contentPadding: FeedContentPadding;
  /** Virtualization settings, which differ because the remote needs depth. */
  performance: ListPerformance;
  onLayout: (event: LayoutChangeEvent) => void;
}

/**
 * Column count and card width of a feed. The list reports its real width, which
 * already accounts for the navigation rail, the safe areas, and split layouts;
 * the window width is only the first guess before the first layout pass.
 *
 * That measured width also decides the column count, so a feed in a narrow
 * column lays itself out as the narrow feed it is.
 */
export function useFeedGeometry(): FeedGeometry {
  const {layout, railWidth, insets, contentInsets} = useAppChrome();
  const {width: windowWidth} = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState(() =>
    Math.max(0, windowWidth - railWidth - insets.left - insets.right),
  );
  const feedLayout = getFeedLayoutClass(measuredWidth, layout);
  const metrics = getFeedMetrics(feedLayout);
  const contentPadding = getFeedContentPadding(
    feedLayout,
    metrics,
    contentInsets,
  );

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const {width} = event.nativeEvent.layout;

    setMeasuredWidth(previous => (previous === width ? previous : width));
  }, []);

  return {
    metrics,
    cardWidth: getFeedCardWidth(
      measuredWidth,
      metrics,
      contentPadding.paddingStart + contentPadding.paddingEnd,
    ),
    contentPadding,
    performance: getFeedListPerformance(feedLayout),
    onLayout,
  };
}
