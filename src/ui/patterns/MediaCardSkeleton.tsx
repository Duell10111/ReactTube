import React from "react";
import {StyleSheet, View, type DimensionValue} from "react-native";

import {mediaCardAspectRatio} from "./mediaCardModel";

import {Skeleton} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

interface MediaCardSkeletonProps {
  width?: DimensionValue;
  /** Width the aspect ratio is resolved against, so no card jumps on load. */
  resolvedWidth: number;
}

/**
 * Placeholder with the geometry of a loaded card. It reserves the thumbnail and
 * both metadata lines, so the first page does not reflow when it arrives.
 */
export function MediaCardSkeleton({
  width,
  resolvedWidth,
}: MediaCardSkeletonProps) {
  const {theme} = useAppTheme();
  const titleHeight = theme.typography.titleSmall.lineHeight;
  const metadataHeight = theme.typography.bodySmall.lineHeight;

  return (
    <View style={[styles.container, {width, gap: theme.spacing.sm}]}>
      <Skeleton
        height={Math.round(resolvedWidth / mediaCardAspectRatio.wide)}
        radius={theme.radii.card}
      />
      <View
        style={[
          styles.metadata,
          {gap: theme.spacing.xs, paddingHorizontal: theme.spacing.sm},
        ]}>
        <Skeleton height={titleHeight} width={"80%"} />
        <Skeleton height={metadataHeight} width={"55%"} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexShrink: 1,
  },
  metadata: {
    width: "100%",
  },
});
