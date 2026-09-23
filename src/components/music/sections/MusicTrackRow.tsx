import {MaterialIcons} from "@expo/vector-icons";
import {Image} from "expo-image";
import React, {useMemo} from "react";
import {PixelRatio, Pressable, StyleSheet, View} from "react-native";

import {MusicTrackMenu} from "./MusicTrackMenu";
import {getMusicSubtitle} from "./musicSectionModel";

import type {ElementData} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import {AppText} from "@/ui/components";
import {
  createMediaCardViewModel,
  resolveThumbnailUrl,
  useMediaCardPress,
} from "@/ui/patterns";
import {useAppTheme} from "@/ui/theme";

/** Cover art beside a track title, at the size Music renders it on a phone. */
const thumbnailSize = 48;

const maxThumbnailPixelRatio = 2;

interface MusicTrackRowProps {
  element: ElementData;
  /** Width of the column the row sits in, so a row never outgrows its page. */
  width?: number;
  /** Offers the remove action, for a playlist the user owns. */
  editable?: boolean;
  onRemove?: () => void;
}

/**
 * One entry of a track shelf: square cover art, title, the line Music composes
 * itself, and the overflow menu. Denser than `MediaRow`, whose 16:9 thumbnail
 * would let only two songs share a screen.
 */
export function MusicTrackRow({
  element,
  width,
  editable,
  onRemove,
}: MusicTrackRowProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  // The row only ever renders on a music surface, so a locally stored track
  // without a music marker still belongs in the music player.
  const onPress = useMediaCardPress(element, {music: true});
  const model = useMemo(
    () => createMediaCardViewModel(element, {translate: t}),
    [element, t],
  );
  const subtitle = getMusicSubtitle(element, model.metadataLine);
  const source = resolveThumbnailUrl(
    model.thumbnailUrl,
    thumbnailSize,
    Math.min(PixelRatio.get(), maxThumbnailPixelRatio),
  );

  return (
    <View style={[styles.container, width ? {width} : undefined]}>
      <Pressable
        accessibilityHint={model.accessibilityHint}
        accessibilityLabel={model.accessibilityLabel}
        accessibilityRole={"button"}
        onPress={onPress}
        style={({pressed}) => [
          styles.press,
          {
            gap: theme.spacing.md,
            padding: theme.spacing.xs,
            borderRadius: theme.radii.control,
            backgroundColor: pressed
              ? theme.colors.surfacePressed
              : theme.colors.focusResting,
          },
        ]}>
        <View
          style={[
            styles.thumbnail,
            {
              borderRadius: theme.radii.control,
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
              name={"music-note"}
              size={24}
            />
          )}
        </View>
        <View style={styles.text}>
          <AppText numberOfLines={1} variant={"titleSmall"}>
            {model.title}
          </AppText>
          {subtitle ? (
            <AppText
              color={"textSecondary"}
              numberOfLines={1}
              variant={"bodySmall"}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      </Pressable>
      {element.type === "video" && element.downloaded ? (
        <MaterialIcons
          color={theme.colors.success}
          name={"download-done"}
          size={20}
        />
      ) : null}
      {element.type === "video" ? (
        <MusicTrackMenu
          data={element}
          editable={editable}
          onRemove={onRemove}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  press: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  thumbnail: {
    width: thumbnailSize,
    height: thumbnailSize,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  text: {
    flex: 1,
  },
});
