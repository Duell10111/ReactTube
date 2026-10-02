import {MaterialIcons} from "@expo/vector-icons";
import {Image} from "expo-image";
import React, {useEffect, useRef, useState} from "react";
import {Pressable, StyleSheet, View} from "react-native";

import type {YTVideoInfo} from "@/extraction/Types";
import {useAutoplayCountdown} from "@/hooks/ui/useAutoplayCountdown";
import {useTranslation} from "@/localization";
import {AppButton, AppText, Skeleton} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

/** Long enough to read the title, short enough to feel like autoplay. */
const AUTOPLAY_SECONDS = 8;
const THUMBNAIL_WIDTH = 560;
/**
 * Moving between the hero's own controls blurs one before the next one is
 * focused. Waiting this long tells such a hand-over apart from leaving.
 */
const FOCUS_HANDOFF_MS = 100;

interface UpNextHeroProps {
  /** Missing while the next video is still loading. */
  nextVideo?: YTVideoInfo;
  onPlay: (nextVideo: YTVideoInfo) => void;
  onClose: () => void;
}

/**
 * The first thing after a video: what plays next, a visible countdown, and the
 * two choices that matter. Leaving the hero for the rows below is a decision
 * to look around, so it stops autoplay for good.
 *
 * The thumbnail itself is the play target. Inside a modal the focus engine
 * ignores `hasTVPreferredFocus` and opens on the focusable view nearest the
 * top-left corner; with the thumbnail there, that is the right one instead of
 * the first card of the creator's row.
 */
export function UpNextHero({nextVideo, onPlay, onClose}: UpNextHeroProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const [thumbnailFocused, setThumbnailFocused] = useState(false);
  const {remainingSeconds, progress, running, cancelled, cancel} =
    useAutoplayCountdown({
      totalSeconds: AUTOPLAY_SECONDS,
      enabled: nextVideo !== undefined,
      onElapsed: () => nextVideo && onPlay(nextVideo),
    });

  const blurTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(blurTimeout.current), []);
  const onHeroFocus = () => clearTimeout(blurTimeout.current);
  const onHeroBlur = () => {
    clearTimeout(blurTimeout.current);
    blurTimeout.current = setTimeout(cancel, FOCUS_HANDOFF_MS);
  };

  const play = () => {
    cancel();
    nextVideo && onPlay(nextVideo);
  };

  const thumbnailHeight = Math.round((THUMBNAIL_WIDTH * 9) / 16);
  const status = cancelled
    ? t("video.upNext.stopped")
    : running
      ? t("video.upNext.startsIn", {seconds: remainingSeconds})
      : undefined;

  return (
    <View style={[styles.container, {gap: theme.spacing.xl}]}>
      <Pressable
        accessibilityHint={t("video.upNext.playNow")}
        accessibilityLabel={nextVideo?.title ?? t("video.upNext")}
        accessibilityRole={"button"}
        hasTVPreferredFocus
        onBlur={() => {
          setThumbnailFocused(false);
          onHeroBlur();
        }}
        onFocus={() => {
          setThumbnailFocused(true);
          onHeroFocus();
        }}
        onPress={play}
        style={{
          borderRadius: theme.radii.card + theme.controls.focusBorderWidth,
          borderWidth: theme.controls.focusBorderWidth,
          borderColor: thumbnailFocused
            ? theme.colors.focus
            : theme.colors.focusResting,
        }}>
        <View
          style={[
            styles.thumbnail,
            {
              width: THUMBNAIL_WIDTH,
              height: thumbnailHeight,
              borderRadius: theme.radii.card,
              backgroundColor: theme.colors.surfaceRaised,
            },
          ]}>
          {nextVideo?.thumbnailImage?.url ? (
            <Image
              contentFit={"cover"}
              source={{uri: nextVideo.thumbnailImage.url}}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <Skeleton height={"100%"} radius={theme.radii.card} />
          )}
          <View style={styles.playIconContainer}>
            <View
              style={[
                styles.playIcon,
                {
                  backgroundColor: thumbnailFocused
                    ? theme.colors.textPrimary
                    : theme.colors.scrim,
                  borderRadius: theme.radii.round,
                  padding: theme.spacing.md,
                },
              ]}>
              <MaterialIcons
                color={
                  thumbnailFocused
                    ? theme.colors.background
                    : theme.colors.textPrimary
                }
                name={"play-arrow"}
                size={theme.controls.iconSize * 1.5}
              />
            </View>
          </View>
          {running || progress > 0 ? (
            <View
              style={[
                styles.progressTrack,
                {backgroundColor: theme.colors.scrim},
              ]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.round(progress * 100)}%`,
                    backgroundColor: theme.colors.mediaProgress,
                  },
                ]}
              />
            </View>
          ) : null}
        </View>
      </Pressable>
      <View style={[styles.details, {gap: theme.spacing.sm}]}>
        <AppText color={"textSecondary"} variant={"label"}>
          {t("video.upNext")}
        </AppText>
        {nextVideo ? (
          <>
            <AppText numberOfLines={2} variant={"titleMedium"}>
              {nextVideo.title}
            </AppText>
            {nextVideo.author?.name ? (
              <AppText
                color={"textSecondary"}
                numberOfLines={1}
                variant={"bodySmall"}>
                {nextVideo.author.name}
              </AppText>
            ) : null}
          </>
        ) : (
          <Skeleton height={theme.typography.titleMedium.lineHeight * 2} />
        )}
        <AppText
          accessibilityLiveRegion={"polite"}
          color={"textSecondary"}
          variant={"bodySmall"}>
          {status ?? " "}
        </AppText>
        <View
          style={[
            styles.actions,
            {gap: theme.spacing.md, marginTop: theme.spacing.sm},
          ]}>
          <AppButton
            label={t("video.upNext.playNow")}
            onBlur={onHeroBlur}
            onFocus={onHeroFocus}
            onPress={play}
          />
          <AppButton
            label={t("common.close")}
            onBlur={onHeroBlur}
            onFocus={onHeroFocus}
            onPress={onClose}
            variant={"secondary"}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  thumbnail: {
    overflow: "hidden",
  },
  playIconContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  playIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  progressTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 6,
  },
  progressFill: {
    height: "100%",
  },
  details: {
    flex: 1,
  },
  actions: {
    flexDirection: "row",
  },
});
