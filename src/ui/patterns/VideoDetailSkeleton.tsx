import React from "react";
import {StyleSheet, View} from "react-native";

import {videoPlayerAspectRatio} from "./videoDetailLayout";

import {useTranslation} from "@/localization";
import {Skeleton} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

interface VideoDetailSkeletonProps {
  /** Leaves out the player block where the player is already on screen. */
  metadataOnly?: boolean;
}

/**
 * Initial state of the video detail surface. It reserves the player and the
 * metadata rows in their real proportions, so the screen does not jump once
 * the video info arrives — the lone spinner it replaces gave no such shape.
 */
export function VideoDetailSkeleton({
  metadataOnly = false,
}: VideoDetailSkeletonProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();

  return (
    <View
      accessibilityLabel={t("video.loading")}
      accessibilityRole={"progressbar"}
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      {metadataOnly ? null : (
        <View style={{aspectRatio: videoPlayerAspectRatio}}>
          <Skeleton height={"100%"} radius={theme.radii.none} />
        </View>
      )}
      <View style={{padding: theme.spacing.lg, gap: theme.spacing.md}}>
        <Skeleton height={20} />
        <Skeleton height={20} width={"60%"} />
        <Skeleton height={16} width={"40%"} />
        <View style={[styles.row, {gap: theme.spacing.md}]}>
          <Skeleton height={40} radius={theme.radii.round} width={40} />
          <Skeleton height={20} width={"50%"} />
        </View>
        <View style={[styles.row, {gap: theme.spacing.sm}]}>
          <Skeleton height={48} radius={theme.radii.round} width={96} />
          <Skeleton height={48} radius={theme.radii.round} width={96} />
          <Skeleton height={48} radius={theme.radii.round} width={96} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
});
