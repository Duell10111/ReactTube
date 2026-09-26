import React, {useCallback, useState} from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type ListRenderItem,
} from "react-native";

import {MusicSection} from "./MusicSection";
import {getMusicCardWidth, musicSurfacePadding} from "./musicSectionModel";

import type {HorizontalData} from "@/extraction/ShelfExtraction";
import {useTranslation} from "@/localization";
import {EmptyState, ErrorState, Skeleton} from "@/ui/components";
import {useFeedPagination} from "@/ui/patterns";
import {useAppTheme} from "@/ui/theme";

const skeletonShelves = 3;

const skeletonCards = 3;

interface MusicSectionFeedProps {
  sections: HorizontalData[];
  /** True while the first page is loading, which renders shelf skeletons. */
  loading?: boolean;
  /** Rendered as a retryable error state as long as the feed has no content. */
  error?: unknown;
  onRetry?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  onEndReached?: () => void | Promise<unknown>;
  ListHeaderComponent?: React.ReactElement | null;
  emptyTitle?: string;
  /** Music sometimes says itself why a surface is empty; that text wins. */
  emptyMessage?: string;
  testID?: string;
}

/**
 * The vertical list behind every YouTube Music surface.
 *
 * Music is a stack of shelves, not a grid: nothing here is flattened into rows
 * of equal tiles the way the classic feed does it, because a Music shelf's
 * form — a paging column of tracks, a row of covers — is part of what it says.
 */
export function MusicSectionFeed({
  sections,
  loading = false,
  error,
  onRetry,
  onRefresh,
  refreshing = false,
  onEndReached,
  ListHeaderComponent,
  emptyTitle,
  emptyMessage,
  testID,
}: MusicSectionFeedProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const {width: windowWidth} = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(windowWidth);
  const {loadingMore, handleEndReached} = useFeedPagination(
    onEndReached,
    sections.length > 0,
  );

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const {width} = event.nativeEvent.layout;

    setContainerWidth(previous => (previous === width ? previous : width));
  }, []);

  const renderItem = useCallback<ListRenderItem<HorizontalData>>(
    ({item}) => (
      <MusicSection
        containerWidth={containerWidth}
        data={item}
        padding={musicSurfacePadding}
      />
    ),
    [containerWidth],
  );

  const empty = loading ? (
    <MusicFeedSkeleton containerWidth={containerWidth} />
  ) : error ? (
    <ErrorState onRetry={onRetry} />
  ) : (
    <EmptyState
      message={emptyMessage ?? t("feed.empty.message")}
      title={emptyTitle ?? t("feed.empty.title")}
    />
  );

  return (
    <FlatList
      ListEmptyComponent={empty}
      ListFooterComponent={
        loadingMore ? (
          <ActivityIndicator
            accessibilityLabel={t("feed.loadingMore")}
            color={theme.colors.textSecondary}
            style={{padding: theme.spacing.lg}}
          />
        ) : null
      }
      ListHeaderComponent={ListHeaderComponent}
      contentContainerStyle={{
        paddingVertical: theme.spacing.md,
        gap: theme.spacing.xl,
        flexGrow: 1,
      }}
      data={sections}
      // Music reuses a shelf title as its id, so the position keeps the key unique.
      keyExtractor={(item, index) => `${item.id}-${index}`}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.6}
      onLayout={onLayout}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            onRefresh={onRefresh}
            refreshing={refreshing}
            tintColor={theme.colors.textSecondary}
          />
        ) : undefined
      }
      renderItem={renderItem}
      testID={testID ?? "music-section-feed"}
    />
  );
}

interface MusicFeedSkeletonProps {
  containerWidth: number;
}

/** Initial loading state. It reserves the geometry of a cover shelf. */
function MusicFeedSkeleton({containerWidth}: MusicFeedSkeletonProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const cardWidth = getMusicCardWidth(
    "square",
    Math.max(0, containerWidth - musicSurfacePadding * 2),
  );

  return (
    <View
      accessibilityLabel={t("feed.loading")}
      accessibilityRole={"progressbar"}
      style={{gap: theme.spacing.xl}}>
      {Array.from({length: skeletonShelves}, (_value, shelf) => (
        <View key={`shelf-${shelf}`} style={{gap: theme.spacing.md}}>
          <View style={{paddingHorizontal: musicSurfacePadding}}>
            <Skeleton height={24} width={"55%"} />
          </View>
          <View
            style={[
              styles.skeletonRow,
              {gap: theme.spacing.md, paddingHorizontal: musicSurfacePadding},
            ]}>
            {Array.from({length: skeletonCards}, (_card, card) => (
              <View key={`card-${card}`} style={{gap: theme.spacing.sm}}>
                <Skeleton
                  height={cardWidth}
                  radius={theme.radii.card}
                  width={cardWidth}
                />
                <Skeleton height={14} width={cardWidth * 0.8} />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonRow: {
    flexDirection: "row",
    overflow: "hidden",
  },
});
