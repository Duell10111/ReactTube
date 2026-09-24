import {MaterialCommunityIcons, MaterialIcons} from "@expo/vector-icons";
import {Image} from "expo-image";
import React, {useEffect, useState} from "react";
import {PixelRatio, StyleSheet, View} from "react-native";

import type {MediaCardBadge, MediaCardViewModel} from "./mediaCardModel";
import {resolveThumbnailUrl} from "./thumbnailSource";

import {useTranslation} from "@/localization";
import {AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

const leadingBadges: MediaCardBadge["id"][] = ["live", "mix", "downloaded"];

/**
 * More pixels than this per point are not visible in a thumbnail, and every
 * one of them is decoded memory held for as long as the card is on screen.
 */
const maxThumbnailPixelRatio = 2;

/** Mirrors the width `styles.circle` gives a channel avatar. */
const avatarWidthRatio = 0.6;

interface MediaCardThumbnailProps {
  model: MediaCardViewModel;
  /** Icon and badge sizes differ between touch and TV reading distances. */
  scale: "touch" | "tv";
  /**
   * Width the thumbnail is rendered at, in points. It decides which variant is
   * requested; without it the card asks for whatever size the feed delivered.
   */
  targetWidth?: number;
}

/**
 * Thumbnail, badges, watch progress, and the image error state. Shared by the
 * touch and TV cards so a badge never appears on only one surface.
 */
export function MediaCardThumbnail({
  model,
  scale,
  targetWidth,
}: MediaCardThumbnailProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const [failed, setFailed] = useState(false);
  const tv = scale === "tv";

  useEffect(() => {
    setFailed(false);
  }, [model.thumbnailUrl]);

  const circle = model.shape === "circle";
  const radius = circle ? theme.radii.round : theme.radii.card;
  const avatarMaxWidth = tv ? 220 : 120;
  const leading = model.badges.filter(badge =>
    leadingBadges.includes(badge.id),
  );
  const trailing = model.badges.filter(
    badge => !leadingBadges.includes(badge.id),
  );
  const inset = tv ? theme.spacing.md : theme.spacing.sm;
  // An avatar is capped at a share of the card, so the card width is not the
  // width it is rendered at and would ask for an image several times too large.
  const avatarSize =
    circle && targetWidth
      ? Math.round(Math.min(targetWidth * avatarWidthRatio, avatarMaxWidth))
      : undefined;
  const renderedWidth = avatarSize ?? targetWidth;
  const source = renderedWidth
    ? resolveThumbnailUrl(
        model.thumbnailUrl,
        renderedWidth,
        Math.min(PixelRatio.get(), maxThumbnailPixelRatio),
      )
    : model.thumbnailUrl;

  return (
    <View
      style={[
        styles.container,
        {
          aspectRatio: model.aspectRatio,
          backgroundColor: theme.colors.surfaceRaised,
          borderRadius: radius,
        },
        // A channel avatar is an identity mark, not feed imagery, so it never
        // grows to the full card width. The size is set on both axes: a capped
        // width alone leaves the aspect ratio deriving the height from the
        // uncapped one, which turns the circle into a capsule.
        circle && [
          styles.circle,
          avatarSize === undefined
            ? {maxWidth: avatarMaxWidth, maxHeight: avatarMaxWidth}
            : {width: avatarSize, height: avatarSize},
        ],
      ]}>
      {source && !failed ? (
        <Image
          accessibilityIgnoresInvertColors
          contentFit={"cover"}
          onError={() => setFailed(true)}
          /* A recycled cell reuses the view, so the previous bitmap is released
           * instead of being kept alive behind the new one, and the old image
           * is never shown for a frame under the new card's title. */
          recyclingKey={model.id}
          source={{uri: source}}
          style={styles.image}
        />
      ) : (
        <View
          accessibilityLabel={t("media.thumbnailUnavailable")}
          accessibilityRole={"image"}
          style={styles.fallback}>
          <MaterialIcons
            color={theme.colors.textDisabled}
            name={model.kind === "channel" ? "person" : "image-not-supported"}
            size={tv ? 64 : 40}
          />
        </View>
      )}
      {leading.length > 0 ? (
        <View
          style={[
            styles.badgeRow,
            {start: inset, bottom: inset, gap: theme.spacing.xs},
          ]}>
          {leading.map(badge => (
            <Badge badge={badge} key={badge.id} tv={tv} />
          ))}
        </View>
      ) : null}
      {trailing.length > 0 ? (
        <View
          style={[
            styles.badgeRow,
            {end: inset, bottom: inset, gap: theme.spacing.xs},
          ]}>
          {trailing.map(badge => (
            <Badge badge={badge} key={badge.id} tv={tv} />
          ))}
        </View>
      ) : null}
      {model.progress !== undefined ? (
        <View
          style={[
            styles.progressTrack,
            {backgroundColor: theme.colors.scrim, height: tv ? 6 : 4},
          ]}>
          <View
            style={{
              width: `${model.progress * 100}%`,
              height: "100%",
              backgroundColor: theme.colors.mediaProgress,
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

interface BadgeProps {
  badge: MediaCardBadge;
  tv: boolean;
}

function Badge({badge, tv}: BadgeProps) {
  const {theme} = useAppTheme();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: theme.colors.scrim,
          borderRadius: theme.radii.control,
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.xs / 2,
          gap: theme.spacing.xs,
        },
      ]}>
      {badge.icon === "record" ? (
        <MaterialCommunityIcons
          color={theme.colors.live}
          name={"record"}
          size={tv ? 18 : 12}
        />
      ) : badge.icon ? (
        <MaterialIcons
          color={theme.colors.textPrimary}
          name={badge.icon}
          size={tv ? 20 : 14}
        />
      ) : null}
      <AppText
        style={badge.tone === "live" ? {color: theme.colors.live} : undefined}
        variant={tv ? "label" : "labelSmall"}>
        {badge.label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    overflow: "hidden",
  },
  circle: {
    width: "60%",
    alignSelf: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  fallback: {
    position: "absolute",
    top: 0,
    bottom: 0,
    start: 0,
    end: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeRow: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressTrack: {
    position: "absolute",
    start: 0,
    end: 0,
    bottom: 0,
  },
});
