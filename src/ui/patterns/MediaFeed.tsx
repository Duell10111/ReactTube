import React, {useCallback, useMemo} from "react";
import {
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  View,
  type ListRenderItem,
} from "react-native";

import {
  FeedCardRow,
  FeedFooterLoader,
  FeedSectionHeader,
  FeedSkeleton,
} from "./FeedRows";
import {Shelf} from "./Shelf";
import {buildFeedRows, type FeedItem, type FeedRow} from "./feedLayout";
import {useFeedGeometry} from "./useFeedGeometry";
import {useFeedPagination} from "./useFeedPagination";

import ShelfVideoSelectorProvider from "@/context/ShelfVideoSelector";
import {useTranslation} from "@/localization";
import {AppButton, EmptyState, ErrorState} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";
import {TVFocusRegion} from "@/ui/tv";

export interface MediaFeedProps {
  items: FeedItem[];
  /** True while the first page is loading, which renders card skeletons. */
  loading?: boolean;
  /** Rendered as a retryable error state as long as the feed has no content. */
  error?: unknown;
  onRetry?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  onEndReached?: () => void | Promise<unknown>;
  onElementFocused?: () => void;
  ListHeaderComponent?: React.ReactElement | null;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  testID?: string;
}

/**
 * The feed every migrated surface uses. It owns the responsive column count and
 * the loading, empty, error, refresh, and pagination states, so a screen only
 * supplies data and the actions behind those states.
 */
export function MediaFeed({
  items,
  loading = false,
  error,
  onRetry,
  onRefresh,
  refreshing = false,
  onEndReached,
  onElementFocused,
  ListHeaderComponent,
  emptyTitle,
  emptyMessage,
  emptyActionLabel,
  onEmptyAction,
  testID,
}: MediaFeedProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  // The scroll container keeps only the vertical padding. The horizontal part
  // belongs to the rows, so a shelf can run to the screen edge instead of
  // ending at the margin with a dead band beside it — except for the leading
  // margin on TV, which stays outside the focus region so that a Left press
  // out of the feed reaches the navigation rail.
  const {
    metrics,
    cardWidth,
    contentPadding,
    rowPadding,
    leadingInset,
    performance,
    onLayout,
  } = useFeedGeometry();
  const {loadingMore, handleEndReached} = useFeedPagination(
    onEndReached,
    items.length > 0,
  );

  const rows = useMemo(
    () => buildFeedRows(items, metrics.columns, metrics.shelfPresentation),
    [items, metrics.columns, metrics.shelfPresentation],
  );

  const renderItem = useCallback<ListRenderItem<FeedRow>>(
    ({item}) => {
      switch (item.type) {
        case "shelf":
          return (
            <Shelf metrics={metrics} padding={rowPadding} shelf={item.shelf} />
          );
        case "header":
          return <FeedSectionHeader padding={rowPadding} title={item.title} />;
        case "cards":
          return (
            <FeedCardRow
              cardWidth={cardWidth}
              metrics={metrics}
              padding={rowPadding}
              row={item}
            />
          );
      }
    },
    [cardWidth, metrics, rowPadding],
  );

  const empty = loading ? (
    <FeedSkeleton
      cardWidth={cardWidth}
      metrics={metrics}
      padding={rowPadding}
    />
  ) : error ? (
    <ErrorState onRetry={onRetry} />
  ) : (
    <EmptyState
      actionLabel={emptyActionLabel}
      message={emptyMessage ?? t("feed.empty.message")}
      onAction={onEmptyAction}
      title={emptyTitle ?? t("feed.empty.title")}
    />
  );

  return (
    <ShelfVideoSelectorProvider onElementFocused={onElementFocused}>
      {/*
       * The feed is one focus region: it claims focus when the screen opens, so
       * the first press on the remote moves within the grid instead of going
       * nowhere, and it hands focus back to the card that had it when the user
       * returns from a video. The leading margin is the region's margin, not
       * its padding: a focus region covers everything inside it, and a region
       * reaching into that margin swallows the Left press that leaves the feed
       * for the navigation rail.
       */}
      <TVFocusRegion style={[styles.region, {marginStart: leadingInset}]}>
        <FlatList
          ListEmptyComponent={empty}
          ListFooterComponent={loadingMore ? <FeedFooterLoader /> : null}
          ListHeaderComponent={
            <View style={rowPadding}>
              {ListHeaderComponent}
              {/* A remote cannot pull to refresh, so TV gets a focusable action. */}
              {onRefresh && Platform.isTV ? (
                <View style={{padding: theme.spacing.sm}}>
                  <AppButton
                    label={t("feed.refresh")}
                    loading={refreshing}
                    onPress={onRefresh}
                    variant={"secondary"}
                  />
                </View>
              ) : null}
            </View>
          }
          contentContainerStyle={{
            paddingTop: contentPadding.paddingTop,
            paddingBottom: contentPadding.paddingBottom,
            gap: metrics.gap,
            flexGrow: 1,
          }}
          data={rows}
          initialNumToRender={performance.initialNumToRender}
          keyExtractor={row => row.key}
          maxToRenderPerBatch={performance.maxToRenderPerBatch}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.6}
          onLayout={onLayout}
          removeClippedSubviews={performance.removeClippedSubviews}
          refreshControl={
            onRefresh && !Platform.isTV ? (
              <RefreshControl
                onRefresh={onRefresh}
                refreshing={refreshing}
                tintColor={theme.colors.textSecondary}
              />
            ) : undefined
          }
          renderItem={renderItem}
          testID={testID ?? "media-feed"}
          updateCellsBatchingPeriod={performance.updateCellsBatchingPeriod}
          windowSize={performance.windowSize}
        />
      </TVFocusRegion>
    </ShelfVideoSelectorProvider>
  );
}

const styles = StyleSheet.create({
  region: {
    flex: 1,
  },
});
