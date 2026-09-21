import React, {useCallback, useMemo} from "react";
import {
  FlatList,
  Platform,
  RefreshControl,
  View,
  type ListRenderItem,
} from "react-native";

import {FeedCardRow, FeedFooterLoader, FeedSkeleton} from "./FeedRows";
import {Shelf} from "./Shelf";
import {buildFeedRows, type FeedItem, type FeedRow} from "./feedLayout";
import {useFeedGeometry} from "./useFeedGeometry";
import {useFeedPagination} from "./useFeedPagination";

import ShelfVideoSelectorProvider from "@/context/ShelfVideoSelector";
import {useTranslation} from "@/localization";
import {AppButton, EmptyState, ErrorState} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

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
  const {metrics, cardWidth, onLayout} = useFeedGeometry();
  const {loadingMore, handleEndReached} = useFeedPagination(
    onEndReached,
    items.length > 0,
  );

  const rows = useMemo(
    () => buildFeedRows(items, metrics.columns),
    [items, metrics.columns],
  );

  const renderItem = useCallback<ListRenderItem<FeedRow>>(
    ({item}) =>
      item.type === "shelf" ? (
        <Shelf metrics={metrics} shelf={item.shelf} />
      ) : (
        <FeedCardRow cardWidth={cardWidth} metrics={metrics} row={item} />
      ),
    [cardWidth, metrics],
  );

  const empty = loading ? (
    <FeedSkeleton cardWidth={cardWidth} metrics={metrics} />
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
      <FlatList
        ListEmptyComponent={empty}
        ListFooterComponent={loadingMore ? <FeedFooterLoader /> : null}
        ListHeaderComponent={
          <View>
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
          padding: metrics.padding,
          gap: metrics.gap,
          flexGrow: 1,
        }}
        data={rows}
        keyExtractor={row => row.key}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.6}
        onLayout={onLayout}
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
      />
    </ShelfVideoSelectorProvider>
  );
}
