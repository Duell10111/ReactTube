import React from "react";
import {Image, StyleSheet, View} from "react-native";

import {Thumbnail} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import {AppButton, AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

interface MusicChannelHeaderProps {
  image?: Thumbnail;
  title: string;
  subtitle?: string;
  showPlayEndpoint?: boolean;
  onPlayPress?: () => void;
}

export function MusicChannelHeader({
  title,
  subtitle,
  image,
  showPlayEndpoint,
  onPlayPress,
}: MusicChannelHeaderProps) {
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
            borderRadius: theme.radii.round,
          },
        ]}
        source={{uri: image?.url}}
      />
      <AppText align={"center"} variant={"titleLarge"}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText align={"center"} color={"textSecondary"}>
          {subtitle}
        </AppText>
      ) : null}
      {showPlayEndpoint ? (
        <AppButton label={t("music.playAll")} onPress={onPlayPress} />
      ) : null}
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
});
