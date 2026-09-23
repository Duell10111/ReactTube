import React from "react";
import {ActivityIndicator, StyleSheet, View} from "react-native";

import {MediaCard} from "./MediaCard";
import {MediaCardSkeleton} from "./MediaCardSkeleton";
import type {FeedMetrics, FeedRow, FeedRowPadding} from "./feedLayout";

import {useTranslation} from "@/localization";
import {AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

interface FeedCardRowProps {
  row: Extract<FeedRow, {type: "cards"}>;
  metrics: FeedMetrics;
  cardWidth: number;
  /** The feed's horizontal padding. Rows carry it, the scroll view does not. */
  padding: FeedRowPadding;
}

/**
 * One grid row. The row is built before rendering, so a shelf and a card row
 * can share a single list without a grid guessing which item spans the width.
 */
export function FeedCardRow({
  row,
  metrics,
  cardWidth,
  padding,
}: FeedCardRowProps) {
  const missing = metrics.columns - row.items.length;

  return (
    <View style={[styles.row, {gap: metrics.gap}, padding]}>
      {row.items.map((item, index) => (
        <MediaCard
          element={item}
          key={`${item.id}-${index}`}
          width={cardWidth}
        />
      ))}
      {/* Keeps an incomplete last row aligned with the grid above it. */}
      {Array.from({length: Math.max(0, missing)}, (_value, index) => (
        <View key={`filler-${index}`} style={{width: cardWidth}} />
      ))}
    </View>
  );
}

interface FeedSectionHeaderProps {
  title: string;
  padding: FeedRowPadding;
}

/** Title of a shelf that was flattened into the vertical feed. */
export function FeedSectionHeader({title, padding}: FeedSectionHeaderProps) {
  return (
    <View style={padding}>
      <AppText accessibilityRole={"header"} variant={"titleMedium"}>
        {title}
      </AppText>
    </View>
  );
}

interface FeedSkeletonProps {
  metrics: FeedMetrics;
  cardWidth: number;
  padding: FeedRowPadding;
}

/** Initial loading state. It reserves the card geometry of the first page. */
export function FeedSkeleton({metrics, cardWidth, padding}: FeedSkeletonProps) {
  const {t} = useTranslation();
  const rows = Math.ceil(metrics.skeletonCount / metrics.columns);

  return (
    <View
      accessibilityLabel={t("feed.loading")}
      accessibilityRole={"progressbar"}
      style={{gap: metrics.gap}}>
      {Array.from({length: rows}, (_row, rowIndex) => (
        <View
          key={`skeleton-row-${rowIndex}`}
          style={[styles.row, {gap: metrics.gap}, padding]}>
          {Array.from({length: metrics.columns}, (_card, cardIndex) => (
            <MediaCardSkeleton
              key={`skeleton-${rowIndex}-${cardIndex}`}
              resolvedWidth={cardWidth}
              width={cardWidth}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

/** Pagination state. It never replaces content that is already visible. */
export function FeedFooterLoader() {
  const {theme} = useAppTheme();
  const {t} = useTranslation();

  return (
    <View style={[styles.footer, {paddingVertical: theme.spacing.lg}]}>
      <ActivityIndicator
        accessibilityLabel={t("feed.loadingMore")}
        color={theme.colors.textSecondary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  footer: {
    alignItems: "center",
  },
});
