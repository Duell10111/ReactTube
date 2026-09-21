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
import {buildFeedSections, type FeedItem, type FeedRow} from "./feedLayout";
import {useFeedGeometry} from "./useFeedGeometry";
import {useFeedPagination} from "./useFeedPagination";

import ShelfVideoSelectorProvider from "@/context/ShelfVideoSelector";
import {useTranslation} from "@/localization";
import {AppText, EmptyState, ErrorState} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

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
  const {metrics, cardWidth, onLayout} = useFeedGeometry();
  const {loadingMore, handleEndReached} = useFeedPagination(
    onEndReached,
    items.length > 0,
  );

  const sections = useMemo(
    () => buildFeedSections(items, metrics.columns),
    [items, metrics.columns],
  );

  const renderItem = useCallback<
    SectionListRenderItem<FeedRow, {key: string; title?: string}>
  >(
    ({item}) =>
      item.type === "shelf" ? null : (
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
      message={emptyMessage ?? t("feed.empty.message")}
      title={emptyTitle ?? t("feed.empty.title")}
    />
  );

  return (
    <ShelfVideoSelectorProvider>
      <SectionList
        ListEmptyComponent={empty}
        ListFooterComponent={loadingMore ? <FeedFooterLoader /> : null}
        contentContainerStyle={{
          padding: metrics.padding,
          gap: metrics.gap,
          flexGrow: 1,
        }}
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
        renderSectionHeader={({section}) =>
          section.title ? (
            <View
              style={[
                styles.header,
                {
                  backgroundColor: theme.colors.background,
                  paddingHorizontal: theme.spacing.sm,
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
      />
    </ShelfVideoSelectorProvider>
  );
}

const styles = StyleSheet.create({
  header: {
    width: "100%",
  },
});
