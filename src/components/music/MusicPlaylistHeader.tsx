import {MaterialIcons} from "@expo/vector-icons";
import {Image} from "expo-image";
import React from "react";
import {PixelRatio, StyleSheet, View, useWindowDimensions} from "react-native";

import type {Thumbnail} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import {AppIconButton, AppText} from "@/ui/components";
import {resolveThumbnailUrl} from "@/ui/patterns";
import {useAppTheme} from "@/ui/theme";

/** Share of the screen width the cover takes, as Music sizes it on a phone. */
const coverWidthShare = 0.55;

const maxCoverWidth = 280;

const maxThumbnailPixelRatio = 2;

interface MusicPlaylistHeaderProps {
  image?: Thumbnail;
  title: string;
  /** "Album • Artist • 2023", the line Music composes itself. */
  subtitle?: string;
  /** Track count and running time. */
  secondSubtitle?: string;
  description?: string;
  saved?: boolean;
  onPlayPress?: () => void;
  onSavePress?: () => void;
}

/**
 * Hero of an album, a playlist, or a mix: cover, title, the lines Music writes
 * under it, and the actions as a row of circles around the play button. The
 * whole block is centered, which is what makes a detail screen read as one
 * record rather than as a list with a picture on top.
 */
export function MusicPlaylistHeader({
  image,
  title,
  subtitle,
  secondSubtitle,
  description,
  saved,
  onPlayPress,
  onSavePress,
}: MusicPlaylistHeaderProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const {width} = useWindowDimensions();
  const coverWidth = Math.round(
    Math.min(width * coverWidthShare, maxCoverWidth),
  );
  const source = resolveThumbnailUrl(
    image?.url,
    coverWidth,
    Math.min(PixelRatio.get(), maxThumbnailPixelRatio),
  );

  return (
    <View
      style={[
        styles.container,
        {gap: theme.spacing.sm, padding: theme.spacing.xl},
      ]}>
      <View
        style={[
          styles.cover,
          {
            width: coverWidth,
            height: coverWidth,
            backgroundColor: theme.colors.surfaceRaised,
            borderRadius: theme.radii.card,
            marginBottom: theme.spacing.md,
          },
        ]}>
        {source ? (
          <Image
            accessibilityIgnoresInvertColors
            contentFit={"cover"}
            source={{uri: source}}
            style={styles.image}
          />
        ) : (
          <MaterialIcons
            color={theme.colors.textDisabled}
            name={"music-note"}
            size={48}
          />
        )}
      </View>
      <AppText
        accessibilityRole={"header"}
        align={"center"}
        variant={"display"}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText align={"center"} color={"textSecondary"} variant={"body"}>
          {subtitle}
        </AppText>
      ) : null}
      {secondSubtitle ? (
        <AppText align={"center"} color={"textSecondary"} variant={"bodySmall"}>
          {secondSubtitle}
        </AppText>
      ) : null}
      {description ? (
        <AppText
          align={"center"}
          color={"textSecondary"}
          numberOfLines={4}
          variant={"bodySmall"}>
          {description}
        </AppText>
      ) : null}
      <View
        style={[
          styles.actions,
          {gap: theme.spacing.lg, marginTop: theme.spacing.md},
        ]}>
        {saved !== undefined ? (
          <AppIconButton
            accessibilityLabel={t(saved ? "music.unsave" : "music.save")}
            icon={saved ? "bookmark" : "bookmark-border"}
            onPress={onSavePress}
            selected={saved}
          />
        ) : null}
        {onPlayPress ? (
          <AppIconButton
            accessibilityLabel={t("music.playAll")}
            icon={"play-arrow"}
            onPress={onPlayPress}
            size={"large"}
            variant={"filled"}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  cover: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
