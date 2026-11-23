import {MaterialIcons} from "@expo/vector-icons";
import {Image} from "expo-image";
import React from "react";
import {
  PixelRatio,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, {Defs, LinearGradient, Rect, Stop} from "react-native-svg";

import {getPlaylistMetadataLine} from "./playlistHeroModel";
import {resolveThumbnailUrl} from "./thumbnailSource";

import type {YTPlaylist} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import {AppIconButton, AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

/** Widest the cover grows on a tablet before it stops scaling. */
const coverMaxWidth = 560;

interface PlaylistHeroTouchProps {
  playlist: YTPlaylist;
  /** Cover used when the playlist has none, usually the first entry's. */
  fallbackThumbnailUrl?: string;
  /** Horizontal padding of the feed, which the backdrop reaches past. */
  bleed: number;
  saved?: boolean;
  onPlay: () => void;
  onSave?: () => void;
  onLayout?: React.ComponentProps<typeof View>["onLayout"];
}

/**
 * Playlist header on phones and tablets, modelled on the YouTube app: a large
 * cover over a blurred, tinted copy of itself, the title, owner and counts,
 * and a full-width play button.
 */
export function PlaylistHeroTouch({
  playlist,
  fallbackThumbnailUrl,
  bleed,
  saved,
  onPlay,
  onSave,
  onLayout,
}: PlaylistHeroTouchProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const {width: windowWidth} = useWindowDimensions();
  const coverWidth = Math.min(windowWidth - 2 * bleed, coverMaxWidth);
  const cover = resolveThumbnailUrl(
    playlist.thumbnailImage?.url ?? fallbackThumbnailUrl,
    coverWidth,
    PixelRatio.get(),
  );
  const metadata = getPlaylistMetadataLine(playlist, t);

  return (
    <View
      onLayout={onLayout}
      style={{gap: theme.spacing.md, paddingBottom: theme.spacing.lg}}
      testID={"playlist-hero"}>
      {cover ? (
        // The backdrop reaches past the feed padding to the screen edges and
        // fades into the page, so the header reads as tinted by the cover.
        <View
          pointerEvents={"none"}
          style={[styles.backdrop, {left: -bleed, right: -bleed}]}>
          <Image
            blurRadius={40}
            contentFit={"cover"}
            source={{uri: cover}}
            style={[StyleSheet.absoluteFill, styles.backdropImage]}
          />
          <Svg height={"100%"} style={StyleSheet.absoluteFill} width={"100%"}>
            <Defs>
              <LinearGradient
                id={"playlistHeroFade"}
                x1={"0"}
                x2={"0"}
                y1={"0"}
                y2={"1"}>
                <Stop
                  offset={"0"}
                  stopColor={theme.colors.background}
                  stopOpacity={"0.2"}
                />
                <Stop
                  offset={"1"}
                  stopColor={theme.colors.background}
                  stopOpacity={"1"}
                />
              </LinearGradient>
            </Defs>
            <Rect
              fill={"url(#playlistHeroFade)"}
              height={"100%"}
              width={"100%"}
            />
          </Svg>
        </View>
      ) : null}
      {cover ? (
        <Image
          accessibilityIgnoresInvertColors
          contentFit={"cover"}
          source={{uri: cover}}
          style={[
            styles.cover,
            {
              width: coverWidth,
              backgroundColor: theme.colors.surfaceRaised,
              borderRadius: theme.radii.card,
            },
          ]}
        />
      ) : null}
      <View style={{gap: theme.spacing.xs}}>
        <AppText
          accessibilityRole={"header"}
          numberOfLines={3}
          variant={"titleLarge"}>
          {playlist.title}
        </AppText>
        {playlist.ownerName ? (
          <AppText numberOfLines={1} variant={"label"}>
            {t("playlist.byOwner", {name: playlist.ownerName})}
          </AppText>
        ) : null}
        <AppText
          color={"textSecondary"}
          numberOfLines={2}
          variant={"bodySmall"}>
          {metadata}
        </AppText>
        {playlist.description ? (
          <AppText
            color={"textSecondary"}
            numberOfLines={2}
            variant={"bodySmall"}>
            {playlist.description}
          </AppText>
        ) : null}
      </View>
      <View style={[styles.actions, {gap: theme.spacing.sm}]}>
        <Pressable
          accessibilityLabel={t("playlist.playAll")}
          accessibilityRole={"button"}
          onPress={onPlay}
          style={({pressed}) => [
            styles.play,
            {
              gap: theme.spacing.xs,
              backgroundColor: theme.colors.textPrimary,
              borderRadius: theme.radii.round,
            },
            pressed && styles.pressed,
          ]}
          testID={"playlist-play-all"}>
          <MaterialIcons
            color={theme.colors.background}
            name={"play-arrow"}
            size={24}
          />
          <AppText style={{color: theme.colors.background}} variant={"label"}>
            {t("playlist.playAll")}
          </AppText>
        </Pressable>
        {saved !== undefined && onSave ? (
          <AppIconButton
            accessibilityLabel={t(saved ? "playlist.remove" : "playlist.save")}
            icon={saved ? "playlist-add-check" : "playlist-add"}
            onPress={onSave}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    overflow: "hidden",
  },
  backdropImage: {
    opacity: 0.55,
  },
  cover: {
    alignSelf: "center",
    aspectRatio: 16 / 9,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
  },
  play: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  pressed: {
    opacity: 0.8,
  },
});
