import React, {useCallback} from "react";
import {
  ActivityIndicator,
  FlatList,
  View,
  type ListRenderItem,
} from "react-native";

import {MusicTrackRow} from "./MusicTrackRow";
import {musicSurfacePadding} from "./musicSectionModel";

import type {ElementData} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import {EmptyState, ErrorState, Skeleton} from "@/ui/components";
import {useFeedPagination} from "@/ui/patterns";
import {useAppTheme} from "@/ui/theme";

const skeletonRows = 8;

const skeletonThumbnailSize = 48;

interface MusicTrackListProps {
  items: ElementData[];
  /** The hero of the album, playlist, or mix the tracks belong to. */
  ListHeaderComponent?: React.ReactElement | null;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  onEndReached?: () => void | Promise<unknown>;
  /** Offers the remove action on every row, for a playlist the user owns. */
  editable?: boolean;
  onRemoveItem?: (item: ElementData) => void;
  testID?: string;
}

/**
 * The track list of a music detail screen. It is the same row the home feed's
 * shelves use, so a song looks the same wherever it is met.
 */
export function MusicTrackList({
  items,
  ListHeaderComponent,
  loading = false,
  error,
  onRetry,
  onEndReached,
  editable,
  onRemoveItem,
  testID,
}: MusicTrackListProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const {loadingMore, handleEndReached} = useFeedPagination(
    onEndReached,
    items.length > 0,
  );

  const renderItem = useCallback<ListRenderItem<ElementData>>(
    ({item}) => (
      <MusicTrackRow
        editable={editable}
        element={item}
        onRemove={() => onRemoveItem?.(item)}
      />
    ),
    [editable, onRemoveItem],
  );

  const empty = loading ? (
    <MusicTrackListSkeleton />
  ) : error ? (
    <ErrorState onRetry={onRetry} />
  ) : (
    <EmptyState
      message={t("feed.empty.message")}
      title={t("feed.empty.title")}
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
        paddingBottom: theme.spacing.lg,
        paddingHorizontal: musicSurfacePadding,
        flexGrow: 1,
      }}
      data={items}
      // A track can appear twice in a playlist, so the position keeps the key unique.
      keyExtractor={(item, index) => `${item.id}-${index}`}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.6}
      renderItem={renderItem}
      testID={testID ?? "music-track-list"}
    />
  );
}

/** Initial loading state. It reserves the geometry of the first rows. */
function MusicTrackListSkeleton() {
  const {theme} = useAppTheme();
  const {t} = useTranslation();

  return (
    <View
      accessibilityLabel={t("feed.loading")}
      accessibilityRole={"progressbar"}
      style={{gap: theme.spacing.md, paddingVertical: theme.spacing.md}}>
      {Array.from({length: skeletonRows}, (_value, row) => (
        <View
          key={`row-${row}`}
          style={{flexDirection: "row", gap: theme.spacing.md}}>
          <Skeleton
            height={skeletonThumbnailSize}
            radius={theme.radii.control}
            width={skeletonThumbnailSize}
          />
          <View style={{flex: 1, gap: theme.spacing.sm}}>
            <Skeleton height={16} width={"70%"} />
            <Skeleton height={12} width={"45%"} />
          </View>
        </View>
      ))}
    </View>
  );
}
