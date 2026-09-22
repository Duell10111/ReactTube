import React from "react";
import {Image, StyleSheet, View} from "react-native";

import {Thumbnail} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import {AppButton, AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

interface MusicPlaylistHeaderProps {
  image?: Thumbnail;
  title: string;
  subtitle: string;
  saved?: boolean;
  onPlayPress?: () => void;
  onSavePress?: () => void;
}

export function MusicPlaylistHeader({
  image,
  title,
  subtitle,
  saved,
  onPlayPress,
  onSavePress,
}: MusicPlaylistHeaderProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();

  return (
    <View
      style={[
        styles.metadataContainer,
        {gap: theme.spacing.sm, padding: theme.spacing.xl},
      ]}>
      <Image
        style={[
          styles.imageStyle,
          {
            backgroundColor: theme.colors.surfaceRaised,
            borderRadius: theme.radii.card,
          },
        ]}
        source={{uri: image?.url}}
      />
      <AppText align={"center"} variant={"titleLarge"}>
        {title}
      </AppText>
      <AppText align={"center"} color={"textSecondary"}>
        {subtitle}
      </AppText>
      <View style={[styles.buttonContainer, {gap: theme.spacing.sm}]}>
        <AppButton label={t("music.playAll")} onPress={onPlayPress} />
        {saved !== undefined ? (
          <AppButton
            label={t(saved ? "music.unsave" : "music.save")}
            onPress={onSavePress}
            variant={"secondary"}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  metadataContainer: {
    alignItems: "center",
  },
  imageStyle: {
    width: 150,
    height: 150,
  },
  buttonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
});
