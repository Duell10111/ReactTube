import {MaterialIcons} from "@expo/vector-icons";
import {useIsFocused, useNavigation} from "@react-navigation/native";
import {Image} from "expo-image";
import React, {useEffect, useMemo, useRef, useState} from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import {ResizeMode} from "react-native-video";

import VideoComponent from "@/components/VideoComponent";
import type {ShortRole} from "@/components/shorts/tv/shortsQueueModel";
import {useAppData} from "@/context/AppDataContext";
import {useVideoSidePanel} from "@/context/VideoSidePanelContext";
import {useSubscriptionToggle} from "@/hooks/channel/useSubscriptionToggle";
import useChannelDetails from "@/hooks/useChannelDetails";
import useVideoDetails from "@/hooks/useVideoDetails";
import {useTranslation} from "@/localization";
import type {RootNavProp} from "@/navigation/RootStackNavigator";
import {AppButton, AppIconButton, AppText} from "@/ui/components";
import {createVideoDetailViewModel} from "@/ui/patterns";
import {darkColors, useAppTheme} from "@/ui/theme";
import {useTVOverscanInsets} from "@/ui/tv";
import LOGGER from "@/utils/Logger";

/** Every focusable control of a short; used to keep focus across shorts. */
export type ShortFocusSlot =
  | "video"
  | "subscribe"
  | "like"
  | "dislike"
  | "comments"
  | "save"
  | "details";

/** -1 when the short came from above, 1 from below, 0 on first open. */
export type ShortEntrance = -1 | 0 | 1;

interface Props {
  videoId: string;
  /** Neighbours stay mounted hidden so switching to them is instant. */
  role: ShortRole;
  entrance: ShortEntrance;
  paused: boolean;
  onTogglePause: () => void;
  focusSlot: ShortFocusSlot;
  onFocusSlot: (slot: ShortFocusSlot) => void;
  hasPrevious: boolean;
  hasNext: boolean;
}

const SHORT_ASPECT_RATIO = 9 / 16;
const ENTRANCE_OFFSET = 120;
const ENTRANCE_DURATION_MS = 260;
/** Room above and below the card for the previous/next hints. */
const HINT_SPACE = 56;
/** Seconds between watch-time reports, matching the regular TV player. */
const WATCH_TIME_INTERVAL_SECONDS = 30;
/**
 * Whether the next short already gets a (paused) player that buffers ahead.
 * Android renders video into a SurfaceView, which ignores the opacity that
 * hides a preloaded short, so it only preloads metadata and streams there.
 */
const PRELOAD_NEXT_PLAYER = Platform.OS === "ios";

/**
 * One short in the TV shorts player: the vertical video as a card in the
 * middle of the screen and its metadata and actions to the right, modelled on
 * the YouTube TV app.
 *
 * The screen keeps the previous and next short mounted next to the active one,
 * keyed by video id. A hidden item already resolves its streams, and the next
 * one also buffers in a paused player, so moving to it only reveals it. The
 * player therefore sits at a fixed place in the tree that does not depend on
 * the role; focusable controls exist only while the item is active.
 */
export function TVShortItem({
  videoId,
  role,
  entrance,
  paused,
  onTogglePause,
  focusSlot,
  onFocusSlot,
  hasPrevious,
  hasNext,
}: Props) {
  const navigation = useNavigation<RootNavProp>();
  const isFocused = useIsFocused();
  const {t, formatNumber, formatDate} = useTranslation();
  const {theme} = useAppTheme();
  const {appSettings} = useAppData();
  const {prepare: prepareSidePanel} = useVideoSidePanel();
  const overscan = useTVOverscanInsets();
  const {height} = useWindowDimensions();

  const {
    YTVideoInfo,
    videoUrl,
    reportPlaybackFailure,
    reportProgress,
    actionData,
    like,
    dislike,
    removeRating,
    addToWatchHistory,
  } = useVideoDetails(videoId, "TV");
  const {parsedChannel} = useChannelDetails(YTVideoInfo?.channel_id ?? "");
  const subscription = useSubscriptionToggle(
    YTVideoInfo?.channel_id,
    YTVideoInfo?.subscribed,
  );

  const [progress, setProgress] = useState(0);
  const [cardFocused, setCardFocused] = useState(false);
  const lastReportedRef = useRef<number>(undefined);

  const cardHeight = height - overscan.top - overscan.bottom - 2 * HINT_SPACE;
  const cardWidth = Math.round(cardHeight * SHORT_ASPECT_RATIO);

  const active = role === "active";
  const mountPlayer = active || (role === "next" && PRELOAD_NEXT_PLAYER);

  const entranceValue = useRef(new Animated.Value(entrance)).current;
  useEffect(() => {
    if (!active) {
      return;
    }
    // Read once on activation: the entrance belongs to this step, not to
    // later re-renders.
    entranceValue.setValue(entrance);
    Animated.timing(entranceValue, {
      toValue: 0,
      duration: ENTRANCE_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, entranceValue]);

  const detailModel = useMemo(
    () =>
      YTVideoInfo
        ? createVideoDetailViewModel(YTVideoInfo, {
            translate: t,
            formatNumber,
            formatDate,
            canOpenComments: true,
          })
        : undefined,
    [YTVideoInfo, formatDate, formatNumber, t],
  );

  const openSidePanel = (tab: "details" | "comments") => {
    if (!detailModel) {
      return;
    }
    prepareSidePanel({
      videoId,
      model: detailModel,
      queueEntries: [],
      initialTab: tab,
    });
    navigation.navigate("VideoPlayerInfo");
  };

  // `actionData` carries the optimistic rating, so the buttons switch on the
  // press instead of waiting for the request.
  const liked = Boolean(actionData?.liked);
  const disliked = Boolean(actionData?.disliked);

  const toggleRating = (target: "like" | "dislike") => {
    const rated = target === "like" ? liked : disliked;
    (rated ? removeRating : target === "like" ? like : dislike)().catch(
      LOGGER.warn,
    );
  };

  const trackWatchTime = (currentTime: number) => {
    if (!appSettings.trackingEnabled) {
      return;
    }
    const last = lastReportedRef.current;
    if (
      last === undefined ||
      Math.abs(last - currentTime) > WATCH_TIME_INTERVAL_SECONDS
    ) {
      addToWatchHistory(
        last === undefined ? undefined : Math.floor(currentTime),
      ).catch(LOGGER.warn);
      lastReportedRef.current = currentTime;
    }
  };

  const thumbnailUrl =
    YTVideoInfo?.thumbnailImage?.url ??
    `https://i.ytimg.com/vi/${videoId}/hq2.jpg`;
  const unavailableReason =
    YTVideoInfo && !videoUrl
      ? (YTVideoInfo.originalData.playability_status?.reason ??
        t("video.unavailable.message"))
      : undefined;

  const slotProps = (slot: ShortFocusSlot) => ({
    hasTVPreferredFocus: focusSlot === slot,
    onFocus: () => onFocusSlot(slot),
  });

  const translateY = entranceValue.interpolate({
    inputRange: [-1, 1],
    outputRange: [-ENTRANCE_OFFSET, ENTRANCE_OFFSET],
  });
  const opacity = entranceValue.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [0, 1, 0],
  });

  return (
    <View
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? "auto" : "no-hide-descendants"}
      pointerEvents={active ? "box-none" : "none"}
      style={[StyleSheet.absoluteFill, active ? styles.active : styles.hidden]}>
      {active ? (
        <Image
          blurRadius={60}
          contentFit={"cover"}
          source={{uri: thumbnailUrl}}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View style={[StyleSheet.absoluteFill, styles.backdropScrim]} />
      <Animated.View
        style={[
          styles.row,
          {
            paddingTop: overscan.top,
            paddingBottom: overscan.bottom,
            paddingHorizontal: overscan.left,
            opacity,
            transform: [{translateY}],
          },
        ]}>
        <View style={styles.side} />
        <View style={styles.cardColumn}>
          <NavigationHint
            accessibilityLabel={t("shorts.previous")}
            icon={"keyboard-arrow-up"}
            visible={hasPrevious}
          />
          <View
            style={[
              styles.card,
              {
                width: cardWidth,
                height: cardHeight,
                borderRadius: theme.radii.panel,
                borderColor:
                  active && cardFocused ? darkColors.focus : "transparent",
              },
            ]}>
            <View
              style={[styles.cardClip, {borderRadius: theme.radii.panel - 4}]}>
              <Image
                contentFit={"cover"}
                source={{uri: thumbnailUrl}}
                style={StyleSheet.absoluteFill}
              />
              {mountPlayer && videoUrl && YTVideoInfo ? (
                <VideoComponent
                  url={videoUrl}
                  videoInfo={YTVideoInfo}
                  onPlaybackFailure={reportPlaybackFailure}
                  onProgress={data => {
                    reportProgress(data.currentTime);
                    trackWatchTime(data.currentTime);
                    const duration =
                      data.seekableDuration || YTVideoInfo.durationSeconds;
                    if (duration) {
                      setProgress(Math.min(data.currentTime / duration, 1));
                    }
                  }}
                  style={StyleSheet.absoluteFill}
                  fullscreen={false}
                  paused={!active || paused || !isFocused}
                  controls={false}
                  repeat
                  resizeMode={ResizeMode.COVER}
                />
              ) : null}
              {unavailableReason ? (
                <View style={[StyleSheet.absoluteFill, styles.cardOverlay]}>
                  <AppText align={"center"} style={styles.onMedia}>
                    {unavailableReason}
                  </AppText>
                </View>
              ) : active && paused ? (
                <View
                  accessibilityLabel={t("shorts.player.paused")}
                  style={[StyleSheet.absoluteFill, styles.cardOverlay]}>
                  <MaterialIcons
                    color={darkColors.textPrimary}
                    name={"play-arrow"}
                    size={120}
                  />
                </View>
              ) : null}
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {width: `${Math.round(progress * 1000) / 10}%`},
                  ]}
                />
              </View>
            </View>
            {active ? (
              <Pressable
                accessibilityHint={t("shorts.player.hint")}
                accessibilityLabel={YTVideoInfo?.title ?? t("video.loading")}
                accessibilityRole={"button"}
                hasTVPreferredFocus={focusSlot === "video"}
                onBlur={() => setCardFocused(false)}
                onFocus={() => {
                  setCardFocused(true);
                  onFocusSlot("video");
                }}
                onPress={onTogglePause}
                style={StyleSheet.absoluteFill}
              />
            ) : null}
          </View>
          <NavigationHint
            accessibilityLabel={t("shorts.next")}
            icon={"keyboard-arrow-down"}
            visible={hasNext}
          />
        </View>
        <View style={[styles.side, styles.info, {gap: theme.spacing.lg}]}>
          {active ? (
            <>
              <AppText
                numberOfLines={3}
                style={styles.onMedia}
                variant={"titleLarge"}>
                {YTVideoInfo?.title ?? ""}
              </AppText>
              <View style={[styles.channel, {gap: theme.spacing.md}]}>
                <Image
                  contentFit={"cover"}
                  source={
                    parsedChannel?.thumbnail?.url
                      ? {uri: parsedChannel.thumbnail.url}
                      : undefined
                  }
                  style={styles.avatar}
                />
                <AppText style={styles.onMedia} variant={"titleSmall"}>
                  {YTVideoInfo?.channel?.name ??
                    YTVideoInfo?.author?.name ??
                    ""}
                </AppText>
              </View>
              {/* One row on purpose: up and down switch the short, so no
              focusable control may sit above or below another. */}
              <View style={[styles.actions, {gap: theme.spacing.md}]}>
                <AppButton
                  label={
                    subscription.subscribed
                      ? t("video.subscribed")
                      : t("video.subscribe")
                  }
                  onPress={subscription.toggle}
                  variant={subscription.subscribed ? "secondary" : "primary"}
                  {...slotProps("subscribe")}
                />
                <AppIconButton
                  accessibilityLabel={t("video.action.like")}
                  icon={liked ? "thumb-up" : "thumb-up-off-alt"}
                  onPress={() => toggleRating("like")}
                  selected={liked}
                  variant={liked ? "accent" : "surface"}
                  {...slotProps("like")}
                />
                <AppIconButton
                  accessibilityLabel={t("video.action.dislike")}
                  icon={disliked ? "thumb-down" : "thumb-down-off-alt"}
                  onPress={() => toggleRating("dislike")}
                  selected={disliked}
                  variant={disliked ? "accent" : "surface"}
                  {...slotProps("dislike")}
                />
                <AppIconButton
                  accessibilityLabel={t("video.action.comments")}
                  icon={"comment"}
                  onPress={() => openSidePanel("comments")}
                  {...slotProps("comments")}
                />
                <AppIconButton
                  accessibilityLabel={t("video.action.save")}
                  icon={"playlist-add"}
                  onPress={() =>
                    navigation.navigate("PlaylistManagerContextMenu", {videoId})
                  }
                  {...slotProps("save")}
                />
                <AppIconButton
                  accessibilityLabel={t("video.player.details")}
                  icon={"more-vert"}
                  onPress={() => openSidePanel("details")}
                  {...slotProps("details")}
                />
              </View>
            </>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

interface NavigationHintProps {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  accessibilityLabel: string;
  visible: boolean;
}

function NavigationHint({
  icon,
  accessibilityLabel,
  visible,
}: NavigationHintProps) {
  return (
    <View
      accessibilityElementsHidden={!visible}
      accessibilityLabel={accessibilityLabel}
      style={styles.hint}>
      {visible ? (
        <MaterialIcons color={darkColors.textSecondary} name={icon} size={48} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // The shorts surface stays dark in either theme: its text sits on a dimmed
  // video thumbnail, not on the app background.
  active: {
    zIndex: 1,
  },
  hidden: {
    opacity: 0,
    zIndex: 0,
  },
  backdropScrim: {
    backgroundColor: "rgba(15, 15, 15, 0.7)",
  },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  side: {
    flex: 1,
  },
  cardColumn: {
    alignItems: "center",
  },
  card: {
    borderWidth: 4,
    padding: 0,
  },
  cardClip: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "black",
  },
  cardOverlay: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    padding: 24,
  },
  progressTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  progressFill: {
    height: "100%",
    backgroundColor: darkColors.mediaProgress,
  },
  hint: {
    height: HINT_SPACE,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    alignSelf: "flex-end",
    justifyContent: "flex-end",
    paddingLeft: 40,
    paddingBottom: HINT_SPACE,
  },
  channel: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: darkColors.surfaceRaised,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
  },
  onMedia: {
    color: darkColors.textPrimary,
  },
});
