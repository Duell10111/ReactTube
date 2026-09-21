import React, {useCallback} from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  View,
  type ListRenderItem,
} from "react-native";

import {MediaCard} from "./MediaCard";
import type {FeedMetrics} from "./feedLayout";

import type {HorizontalData} from "@/extraction/ShelfExtraction";
import type {ElementData} from "@/extraction/Types";
import useHorizontalData from "@/hooks/tv/useHorizontalData";
import {useTranslation} from "@/localization";
import {AppButton, AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

interface ShelfProps {
  shelf: HorizontalData;
  metrics: FeedMetrics;
  /** Rendered as the trailing shelf action when the surface supports it. */
  onSeeAll?: () => void;
}

/**
 * Horizontal section of a feed: a title, an optional "see all" action, and a
 * row of media cards that pages on its own.
 */
export function Shelf({shelf, metrics, onSeeAll}: ShelfProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const {elements, fetchMore} = useHorizontalData(shelf);

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
      <View
        style={[
          styles.header,
          {paddingHorizontal: theme.spacing.sm, gap: theme.spacing.md},
        ]}>
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
      <FlatList
        contentContainerStyle={{
          gap: metrics.gap,
          paddingHorizontal: theme.spacing.sm,
        }}
        data={elements}
        horizontal
        keyExtractor={keyExtractor}
        onEndReached={fetchMore}
        onEndReachedThreshold={0.8}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={!Platform.isTV}
      />
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
