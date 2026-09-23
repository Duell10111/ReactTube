import React, {useCallback} from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  View,
  type ListRenderItem,
} from "react-native";

import {MediaCard} from "./MediaCard";
import type {FeedMetrics, FeedRowPadding} from "./feedLayout";
import {getShelfListPerformance} from "./feedPerformance";

import type {HorizontalData} from "@/extraction/ShelfExtraction";
import type {ElementData} from "@/extraction/Types";
import useHorizontalData from "@/hooks/tv/useHorizontalData";
import {useTranslation} from "@/localization";
import {AppButton, AppText} from "@/ui/components";
import {useAppChrome} from "@/ui/layout";
import {useAppTheme} from "@/ui/theme";
import {TVFocusRegion} from "@/ui/tv";

interface ShelfProps {
  shelf: HorizontalData;
  metrics: FeedMetrics;
  /**
   * The feed's horizontal padding. It is applied to the shelf's own content
   * rather than around the shelf, so the row runs to the screen edge and only
   * its first card lines up with the grid above it.
   */
  padding: FeedRowPadding;
  /** Rendered as the trailing shelf action when the surface supports it. */
  onSeeAll?: () => void;
}

/**
 * Horizontal section of a feed: a title, an optional "see all" action, and a
 * row of media cards that pages on its own.
 */
export function Shelf({shelf, metrics, padding, onSeeAll}: ShelfProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const {elements, fetchMore} = useHorizontalData(shelf);
  const {layout} = useAppChrome();
  const performance = getShelfListPerformance(layout);

  const renderItem = useCallback<ListRenderItem<ElementData>>(
    ({item}) => <MediaCard element={item} width={metrics.shelfCardWidth} />,
    [metrics.shelfCardWidth],
  );

  // The same element can appear twice in a shelf, so the index is part of the key.
  const keyExtractor = useCallback(
    (item: ElementData, index: number) => `${item.id}-${index}`,
    [],
  );

  return (
    <View style={[styles.container, {gap: theme.spacing.sm}]}>
      <View style={[styles.header, padding, {gap: theme.spacing.md}]}>
        <AppText style={styles.title} variant={"titleMedium"}>
          {shelf.title ?? ""}
        </AppText>
        {onSeeAll ? (
          <AppButton
            label={t("feed.seeAll")}
            onPress={onSeeAll}
            variant={"secondary"}
          />
        ) : null}
      </View>
      {/*
       * A shelf is its own focus region: entering it from the row above lands
       * on the card the shelf was left at, not back at its first entry.
       */}
      <TVFocusRegion>
        <FlatList
          contentContainerStyle={{gap: metrics.gap, ...padding}}
          data={elements}
          horizontal
          initialNumToRender={performance.initialNumToRender}
          keyExtractor={keyExtractor}
          maxToRenderPerBatch={performance.maxToRenderPerBatch}
          onEndReached={fetchMore}
          onEndReachedThreshold={0.8}
          removeClippedSubviews={performance.removeClippedSubviews}
          renderItem={renderItem}
          showsHorizontalScrollIndicator={!Platform.isTV}
          updateCellsBatchingPeriod={performance.updateCellsBatchingPeriod}
          windowSize={performance.windowSize}
        />
      </TVFocusRegion>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    flex: 1,
  },
});
