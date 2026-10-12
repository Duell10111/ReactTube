import {MaterialIcons} from "@expo/vector-icons";
import {useNavigation} from "@react-navigation/native";
import {Image} from "expo-image";
import React, {useCallback, useMemo} from "react";
import {PixelRatio, Pressable, StyleSheet, View} from "react-native";

import {MusicTrackMenu} from "./MusicTrackMenu";
import {getMusicCardShape, getMusicSubtitle} from "./musicSectionModel";

import type {ElementData} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import type {NativeStackProp} from "@/navigation/types";
import {AppText} from "@/ui/components";
import {
  createMediaCardViewModel,
  resolveThumbnailUrl,
  useMediaCardPress,
} from "@/ui/patterns";
import {useAppTheme} from "@/ui/theme";

/** Cover art beside a track title, at the size Music renders it on a phone. */
const thumbnailSize = 48;

/** A video frame keeps the row height and grows sideways instead. */
const wideThumbnailWidth = Math.round((thumbnailSize * 16) / 9);

const maxThumbnailPixelRatio = 2;

/** State of the row's track in the music player, if it is the current one. */
export type MusicTrackRowPlayback = "playing" | "paused";

interface MusicTrackRowProps {
  element: ElementData;
  /** Width of the column the row sits in, so a row never outgrows its page. */
  width?: number;
  /** Offers the remove action, for a playlist the user owns. */
  editable?: boolean;
  onRemove?: () => void;
  /**
   * Shows a video's 16:9 frame instead of a square crop. Search lists do this;
   * a track shelf keeps its covers square so the titles stay in one column.
   */
  videoFrame?: boolean;
  /** Marks the row as the track the music player currently holds. */
  playback?: MusicTrackRowPlayback;
}

/**
 * One entry of a track shelf: square cover art, title, the line Music composes
 * itself, and the overflow menu. Denser than `MediaRow`, whose 16:9 thumbnail
 * would let only two songs share a screen. Artists get a round avatar.
 */
export function MusicTrackRow({
  element,
  width,
  editable,
  onRemove,
  videoFrame = false,
  playback,
}: MusicTrackRowProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const navigation = useNavigation<NativeStackProp>();
  // The row only ever renders on a music surface, so a locally stored track
  // without a music marker still belongs in the music player.
  const openElement = useMediaCardPress(element, {music: true});
  // Starting the current track again would restart it and replace its queue,
  // so the current row opens the player instead.
  const onPress = useCallback(() => {
    if (playback) {
      navigation.navigate("MusicPlayerScreen");
    } else {
      openElement();
    }
  }, [navigation, openElement, playback]);
  const model = useMemo(
    () => createMediaCardViewModel(element, {translate: t}),
    [element, t],
  );
  const subtitle = getMusicSubtitle(element, model.metadataLine);
  const shape = getMusicCardShape(element);
  const thumbnailWidth =
    videoFrame && shape === "wide" ? wideThumbnailWidth : thumbnailSize;
  const source = resolveThumbnailUrl(
    model.thumbnailUrl,
    thumbnailWidth,
    Math.min(PixelRatio.get(), maxThumbnailPixelRatio),
  );

  return (
    <View style={[styles.container, width ? {width} : undefined]}>
      <Pressable
        accessibilityHint={model.accessibilityHint}
        accessibilityLabel={
          playback
            ? `${model.accessibilityLabel}, ${t(
                playback === "playing" ? "music.nowPlaying" : "music.nowPaused",
              )}`
            : model.accessibilityLabel
        }
        accessibilityRole={"button"}
        accessibilityState={{selected: playback !== undefined}}
        onPress={onPress}
        style={({pressed}) => [
          styles.press,
          {
            gap: theme.spacing.md,
            padding: theme.spacing.xs,
            borderRadius: theme.radii.control,
            backgroundColor: pressed
              ? theme.colors.surfacePressed
              : playback
                ? theme.colors.surfaceRaised
                : theme.colors.focusResting,
          },
        ]}>
        <View
          style={[
            styles.thumbnail,
            {
              width: thumbnailWidth,
              borderRadius:
                shape === "circle" ? theme.radii.round : theme.radii.control,
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
          {playback ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                styles.playbackOverlay,
                {backgroundColor: theme.colors.scrim},
              ]}>
              <MaterialIcons
                color={theme.colors.brand}
                name={playback === "playing" ? "equalizer" : "play-arrow"}
                size={24}
              />
            </View>
          ) : null}
        </View>
        <View style={styles.text}>
          <AppText
            color={playback ? "brand" : "textPrimary"}
            numberOfLines={1}
            variant={"titleSmall"}>
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
    height: thumbnailSize,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  playbackOverlay: {
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  text: {
    flex: 1,
  },
});
