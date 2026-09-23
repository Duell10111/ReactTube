import {MaterialIcons} from "@expo/vector-icons";
import {Image} from "expo-image";
import React, {useMemo} from "react";
import {PixelRatio, Pressable, StyleSheet, View} from "react-native";

import {getMusicCardShape, getMusicSubtitle} from "./musicSectionModel";

import type {ElementData} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import {AppText} from "@/ui/components";
import {
  createMediaCardViewModel,
  resolveThumbnailUrl,
  useMediaCardPress,
} from "@/ui/patterns";
import {useAppTheme} from "@/ui/theme";

const maxThumbnailPixelRatio = 2;

const videoAspectRatio = 16 / 9;

interface MusicCardProps {
  element: ElementData;
  width: number;
}

/**
 * A cover card in a music carousel. The artwork carries the card, so unlike a
 * feed card it has no badges, no progress bar, and no channel avatar — three
 * lines at most, the way Music lays a shelf out.
 */
export function MusicCard({element, width}: MusicCardProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const onPress = useMediaCardPress(element);
  const model = useMemo(
    () => createMediaCardViewModel(element, {translate: t}),
    [element, t],
  );
  const shape = getMusicCardShape(element);
  const subtitle = getMusicSubtitle(element, model.metadataLine);
  const circle = shape === "circle";
  const height =
    shape === "wide" ? Math.round(width / videoAspectRatio) : width;
  const source = resolveThumbnailUrl(
    model.thumbnailUrl,
    width,
    Math.min(PixelRatio.get(), maxThumbnailPixelRatio),
  );

  return (
    <Pressable
      accessibilityHint={model.accessibilityHint}
      accessibilityLabel={model.accessibilityLabel}
      accessibilityRole={"button"}
      onPress={onPress}
      style={({pressed}) => [
        {width, gap: theme.spacing.sm},
        pressed && styles.pressed,
      ]}>
      <View
        style={[
          styles.thumbnail,
          {
            width,
            height,
            borderRadius: circle ? theme.radii.round : theme.radii.card,
            backgroundColor: theme.colors.surfaceRaised,
          },
        ]}>
        {source ? (
          <Image
            accessibilityIgnoresInvertColors
            contentFit={"cover"}
            recyclingKey={model.id}
            source={{uri: source}}
            style={styles.image}
          />
        ) : (
          <MaterialIcons
            color={theme.colors.textDisabled}
            name={circle ? "person" : "music-note"}
            size={32}
          />
        )}
      </View>
      <View>
        <AppText
          align={circle ? "center" : undefined}
          numberOfLines={2}
          variant={"titleSmall"}>
          {model.title}
        </AppText>
        {subtitle ? (
          <AppText
            align={circle ? "center" : undefined}
            color={"textSecondary"}
            numberOfLines={1}
            variant={"bodySmall"}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  thumbnail: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  pressed: {
    opacity: 0.7,
  },
});
