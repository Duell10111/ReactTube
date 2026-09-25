import React from "react";
import {StyleSheet, View} from "react-native";

import {MediaCardRow} from "./MediaCardRow";
import type {FeedMetrics, FeedRowPadding} from "./feedLayout";

import type {HorizontalData} from "@/extraction/ShelfExtraction";
import useHorizontalData from "@/hooks/tv/useHorizontalData";
import {useTranslation} from "@/localization";
import {AppButton, AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

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
      <MediaCardRow
        elements={elements}
        metrics={metrics}
        onEndReached={fetchMore}
        padding={padding}
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
