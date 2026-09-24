import {useCallback, useState} from "react";
import {useWindowDimensions, type LayoutChangeEvent} from "react-native";

import {
  getFeedCardWidth,
  getFeedContentPadding,
  getFeedLayoutClass,
  getFeedMetrics,
  getFeedRowPadding,
  splitFeedRowPadding,
  type FeedContentPadding,
  type FeedMetrics,
  type FeedRowPadding,
} from "./feedLayout";
import {getFeedListPerformance, type ListPerformance} from "./feedPerformance";

import {useAppChrome} from "@/ui/layout";
import {spacing} from "@/ui/theme";

export interface FeedGeometry {
  metrics: FeedMetrics;
  cardWidth: number;
  /** Padding of the scroll content, including the TV overscan margin. */
  contentPadding: FeedContentPadding;
  /** The horizontal padding the rows carry; see `getFeedRowPadding`. */
  rowPadding: FeedRowPadding;
  /**
   * Margin the feed's focus region keeps outside itself on TV, so the region
   * starts at the first card and a Left press reaches the navigation rail.
   */
  leadingInset: number;
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
  const {leadingInset, rowPadding} = splitFeedRowPadding(
    feedLayout,
    getFeedRowPadding(contentPadding, spacing.sm),
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
      // The list reports its width from inside the leading margin, so on TV
      // that margin is already gone by the time the cards are measured.
      Math.max(
        0,
        contentPadding.paddingStart + contentPadding.paddingEnd - leadingInset,
      ),
    ),
    contentPadding,
    rowPadding,
    leadingInset,
    performance: getFeedListPerformance(feedLayout),
    onLayout,
  };
}
