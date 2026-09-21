import {MaterialCommunityIcons, MaterialIcons} from "@expo/vector-icons";
import {Image} from "expo-image";
import React, {useEffect, useState} from "react";
import {StyleSheet, View} from "react-native";

import type {MediaCardBadge, MediaCardViewModel} from "./mediaCardModel";

import {useTranslation} from "@/localization";
import {AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

const leadingBadges: MediaCardBadge["id"][] = ["live", "mix", "downloaded"];

interface MediaCardThumbnailProps {
  model: MediaCardViewModel;
  /** Icon and badge sizes differ between touch and TV reading distances. */
  scale: "touch" | "tv";
}

/**
 * Thumbnail, badges, watch progress, and the image error state. Shared by the
 * touch and TV cards so a badge never appears on only one surface.
 */
export function MediaCardThumbnail({model, scale}: MediaCardThumbnailProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const [failed, setFailed] = useState(false);
  const tv = scale === "tv";

  useEffect(() => {
    setFailed(false);
  }, [model.thumbnailUrl]);

  const circle = model.shape === "circle";
  const radius = circle ? theme.radii.round : theme.radii.card;
  const leading = model.badges.filter(badge =>
    leadingBadges.includes(badge.id),
  );
  const trailing = model.badges.filter(
    badge => !leadingBadges.includes(badge.id),
  );
  const inset = tv ? theme.spacing.md : theme.spacing.sm;

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
        // grows to the full card width.
        circle && [styles.circle, {maxWidth: tv ? 220 : 120}],
      ]}>
      {model.thumbnailUrl && !failed ? (
        <Image
          accessibilityIgnoresInvertColors
          contentFit={"cover"}
          onError={() => setFailed(true)}
          source={{uri: model.thumbnailUrl}}
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
