import {MaterialIcons} from "@expo/vector-icons";
import {Image} from "expo-image";
import React from "react";
import {PixelRatio, StyleSheet, View, useWindowDimensions} from "react-native";
import Svg, {Defs, LinearGradient, Rect, Stop} from "react-native-svg";

import type {Thumbnail} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import {AppIconButton, AppText, Chip} from "@/ui/components";
import {resolveThumbnailUrl} from "@/ui/patterns";
import {useAppTheme} from "@/ui/theme";

/** Height of the hero image relative to its width. */
const heroAspectRatio = 0.85;

const maxHeroHeight = 420;

/** Share of the hero the fade into the page covers. */
const scrimHeightShare = 0.55;

const maxThumbnailPixelRatio = 2;

interface MusicChannelHeaderProps {
  image?: Thumbnail;
  title: string;
  /** Short line under the name, e.g. a listener count. */
  subtitle?: string;
  /** The artist's biography, which Music keeps under the actions. */
  description?: string;
  subscribed?: boolean;
  subscribeLabel?: string;
  onSubscribePress?: () => void;
  onPlayPress?: () => void;
  onRadioPress?: () => void;
}

/**
 * Hero of an artist page. The picture runs to the edges with the name set into
 * its lower half, so the artist arrives before the shelves do — an avatar
 * above a centered name is the channel page's form, not Music's.
 */
export function MusicChannelHeader({
  image,
  title,
  subtitle,
  description,
  subscribed,
  subscribeLabel,
  onSubscribePress,
  onPlayPress,
  onRadioPress,
}: MusicChannelHeaderProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const {width} = useWindowDimensions();
  const heroHeight = Math.round(
    Math.min(width * heroAspectRatio, maxHeroHeight),
  );
  const source = resolveThumbnailUrl(
    image?.url,
    width,
    Math.min(PixelRatio.get(), maxThumbnailPixelRatio),
  );

  return (
    <View>
      <View
        style={[
          styles.hero,
          {height: heroHeight, backgroundColor: theme.colors.surfaceRaised},
        ]}>
        {source ? (
          <Image
            accessibilityIgnoresInvertColors
            contentFit={"cover"}
            source={{uri: source}}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <MaterialIcons
            color={theme.colors.textDisabled}
            name={"person"}
            size={64}
          />
        )}
        {/*
         * The name sits on the picture, so the picture has to end in the page
         * colour rather than at an edge — otherwise the text lands on whatever
         * the photograph happens to show there.
         */}
        <Svg
          height={Math.round(heroHeight * scrimHeightShare)}
          style={styles.scrim}
          width={"100%"}>
          <Defs>
            <LinearGradient
              id={"musicHeroScrim"}
              x1={"0"}
              x2={"0"}
              y1={"0"}
              y2={"1"}>
              <Stop
                offset={"0"}
                stopColor={theme.colors.background}
                stopOpacity={"0"}
              />
              <Stop
                offset={"1"}
                stopColor={theme.colors.background}
                stopOpacity={"1"}
              />
            </LinearGradient>
          </Defs>
          <Rect fill={"url(#musicHeroScrim)"} height={"100%"} width={"100%"} />
        </Svg>
        <View
          style={[
            styles.titleBlock,
            {paddingHorizontal: theme.spacing.lg, gap: theme.spacing.xs},
          ]}>
          <AppText accessibilityRole={"header"} variant={"display"}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText color={"textSecondary"} numberOfLines={1} variant={"body"}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      </View>
      <View
        style={[
          styles.actions,
          {
            gap: theme.spacing.md,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
          },
        ]}>
        {subscribeLabel && onSubscribePress ? (
          <Chip
            label={subscribeLabel}
            onPress={onSubscribePress}
            selected={subscribed}
          />
        ) : (
          <View style={styles.spacer} />
        )}
        <View style={[styles.trailing, {gap: theme.spacing.md}]}>
          {onRadioPress ? (
            <AppIconButton
              accessibilityLabel={t("music.startRadio")}
              icon={"radio"}
              onPress={onRadioPress}
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
      {description ? (
        <AppText
          color={"textSecondary"}
          numberOfLines={3}
          style={{paddingHorizontal: theme.spacing.lg}}
          variant={"bodySmall"}>
          {description}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  scrim: {
    position: "absolute",
    start: 0,
    end: 0,
    bottom: 0,
  },
  titleBlock: {
    position: "absolute",
    start: 0,
    end: 0,
    bottom: 0,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  spacer: {
    flex: 1,
  },
  trailing: {
    flexDirection: "row",
    alignItems: "center",
  },
});
