import {Image} from "expo-image";
import React from "react";
import {Platform, StyleSheet, View} from "react-native";

import type {YTPlaylist} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import {AppButton, AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

interface PlaylistHeroProps {
  playlist: YTPlaylist;
  saved?: boolean;
  onPlay: () => void;
  onSave?: () => void;
}

/** Metadata and primary actions shared by phone and TV playlist surfaces. */
export function PlaylistHero({
  playlist,
  saved,
  onPlay,
  onSave,
}: PlaylistHeroProps) {
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        Platform.isTV && styles.containerTV,
        {gap: theme.spacing.xl, padding: theme.spacing.xl},
      ]}>
      {playlist.thumbnailImage?.url ? (
        <Image
          contentFit={"cover"}
          source={{uri: playlist.thumbnailImage.url}}
          style={[
            styles.image,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderRadius: theme.radii.card,
            },
          ]}
        />
      ) : null}
      <View style={[styles.copy, {gap: theme.spacing.sm}]}>
        <AppText variant={"titleLarge"}>{playlist.title}</AppText>
        {playlist.author?.name ? (
          <AppText color={"textSecondary"}>{playlist.author.name}</AppText>
        ) : null}
        {playlist.description ? (
          <AppText color={"textSecondary"} numberOfLines={3}>
            {playlist.description}
          </AppText>
        ) : null}
        <View style={[styles.actions, {gap: theme.spacing.sm}]}>
          <AppButton label={t("playlist.playAll")} onPress={onPlay} />
          {saved !== undefined && onSave ? (
            <AppButton
              label={t(saved ? "playlist.remove" : "playlist.save")}
              onPress={onSave}
              variant={"secondary"}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  containerTV: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
  image: {
    aspectRatio: 16 / 9,
    maxWidth: 560,
    width: "100%",
  },
  copy: {
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
});
