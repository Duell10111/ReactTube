import React, {useCallback, useMemo} from "react";
import {
  Platform,
  RefreshControl,
  SectionList,
  StyleSheet,
  View,
  type SectionListRenderItem,
} from "react-native";

import {FeedCardRow, FeedFooterLoader, FeedSkeleton} from "./FeedRows";
import {
  buildFeedSections,
  getFeedRowPadding,
  type FeedItem,
  type FeedRow,
} from "./feedLayout";
import {useFeedGeometry} from "./useFeedGeometry";
import {useFeedPagination} from "./useFeedPagination";

import ShelfVideoSelectorProvider from "@/context/ShelfVideoSelector";
import {useTranslation} from "@/localization";
import {AppText, EmptyState, ErrorState} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";
import {TVFocusRegion} from "@/ui/tv";

export interface MediaSectionFeedProps {
  /** Shelves become titled sections, for example one day of history. */
  items: FeedItem[];
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  onEndReached?: () => void | Promise<unknown>;
  emptyTitle?: string;
  emptyMessage?: string;
  testID?: string;
}

/**
 * Feed for data that is grouped into titled sections instead of one stream.
 * It uses the same cards, geometry, and states as `MediaFeed`, so history and
 * home only differ in how their entries are grouped.
 */
export function MediaSectionFeed({
  items,
  loading = false,
  error,
  onRetry,
  onRefresh,
  refreshing = false,
  onEndReached,
  emptyTitle,
  emptyMessage,
  testID,
}: MediaSectionFeedProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const {metrics, cardWidth, contentPadding, performance, onLayout} =
    useFeedGeometry();
  const {loadingMore, handleEndReached} = useFeedPagination(
    onEndReached,
    items.length > 0,
  );

  const sections = useMemo(
    () => buildFeedSections(items, metrics.columns),
    [items, metrics.columns],
  );

  // Horizontal padding lives on the rows, not on the scroll container; see
  // `getFeedRowPadding`.
  const rowPadding = useMemo(
    () => getFeedRowPadding(contentPadding, theme.spacing.sm),
    [contentPadding, theme.spacing.sm],
  );

  const renderItem = useCallback<
    SectionListRenderItem<FeedRow, {key: string; title?: string}>
  >(
    ({item}) =>
      item.type === "cards" ? (
        <FeedCardRow
          cardWidth={cardWidth}
          metrics={metrics}
          padding={rowPadding}
          row={item}
        />
      ) : null,
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
      message={emptyMessage ?? t("feed.empty.message")}
      title={emptyTitle ?? t("feed.empty.title")}
    />
  );

  return (
    <ShelfVideoSelectorProvider>
      <TVFocusRegion style={styles.region}>
        <SectionList
          ListEmptyComponent={empty}
          ListFooterComponent={loadingMore ? <FeedFooterLoader /> : null}
          contentContainerStyle={{
            paddingTop: contentPadding.paddingTop,
            paddingBottom: contentPadding.paddingBottom,
            gap: metrics.gap,
            flexGrow: 1,
          }}
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
          renderSectionHeader={({section}) =>
            section.title ? (
              <View
                style={[
                  styles.header,
                  rowPadding,
                  {
                    backgroundColor: theme.colors.background,
                    paddingVertical: theme.spacing.sm,
                  },
                ]}>
                <AppText variant={"titleSmall"}>{section.title}</AppText>
              </View>
            ) : null
          }
          sections={sections}
          stickySectionHeadersEnabled={!Platform.isTV}
          testID={testID ?? "media-section-feed"}
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
  header: {
    width: "100%",
  },
});
