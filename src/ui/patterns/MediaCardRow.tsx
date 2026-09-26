import React, {useCallback} from "react";
import {FlatList, Platform, type ListRenderItem} from "react-native";

import {MediaCard} from "./MediaCard";
import type {FeedMetrics, FeedRowPadding} from "./feedLayout";
import {getShelfListPerformance} from "./feedPerformance";

import type {ElementData} from "@/extraction/Types";
import {useAppChrome} from "@/ui/layout";
import {TVFocusRegion} from "@/ui/tv";

export interface MediaCardRowProps {
  elements: ElementData[];
  metrics: FeedMetrics;
  /**
   * The feed's horizontal padding. It is applied to the row's content rather
   * than around it, so the row runs to the screen edge and only its first card
   * lines up with the grid beside it.
   */
  padding: FeedRowPadding;
  onEndReached?: () => void;
  testID?: string;
}

/**
 * A horizontal run of media cards, virtualized and focusable as one region.
 *
 * Every surface that shows cards side by side uses this — the shelves inside a
 * feed and the related videos under the player — so a card is the same card
 * wherever it appears, instead of each surface bringing its own list and its
 * own card.
 */
export function MediaCardRow({
  elements,
  metrics,
  padding,
  onEndReached,
  testID,
}: MediaCardRowProps) {
  const {layout} = useAppChrome();
  const performance = getShelfListPerformance(layout);

  const renderItem = useCallback<ListRenderItem<ElementData>>(
    ({item}) => <MediaCard element={item} width={metrics.shelfCardWidth} />,
    [metrics.shelfCardWidth],
  );

  // The same element can appear twice in a row, so the index is part of the key.
  const keyExtractor = useCallback(
    (item: ElementData, index: number) => `${item.id}-${index}`,
    [],
  );

  return (
    // The row is its own focus region: entering it from above lands on the card
    // it was left at, not back at its first entry.
    <TVFocusRegion>
      <FlatList
        contentContainerStyle={{gap: metrics.gap, ...padding}}
        data={elements}
        horizontal
        initialNumToRender={performance.initialNumToRender}
        keyExtractor={keyExtractor}
        maxToRenderPerBatch={performance.maxToRenderPerBatch}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.8}
        removeClippedSubviews={performance.removeClippedSubviews}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={!Platform.isTV}
        testID={testID}
        updateCellsBatchingPeriod={performance.updateCellsBatchingPeriod}
        windowSize={performance.windowSize}
      />
    </TVFocusRegion>
  );
}
