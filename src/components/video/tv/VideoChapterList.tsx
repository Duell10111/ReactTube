import {MaterialIcons} from "@expo/vector-icons";
import {Image} from "expo-image";
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {
  Animated,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  TVFocusGuideView,
  View,
  type FocusGuideMethods,
  type ListRenderItem,
} from "react-native";

import {
  findActiveChapterIndex,
  formatChapterTimestamp,
  getChapterProgress,
} from "./chapterModel";

import {usePlaybackTime} from "@/components/video/videoPlayer/PlaybackTimeContext";
import {useShelfVideoSelector} from "@/context/ShelfVideoSelector";
import {YTChapter} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import {AppText} from "@/ui/components";
import {getFeedRowPadding, useFeedGeometry} from "@/ui/patterns";
import {useAppTheme} from "@/ui/theme";

interface VideoChapterListProps {
  chapters: YTChapter[];
  onPress?: (chapter: YTChapter) => void;
}

/**
 * The chapters of the playing video, as a row under the player controls.
 *
 * It follows the related videos below it — same card width, gap, padding, and
 * focus treatment — and marks the chapter that is playing: a badge and the
 * progress through that chapter on its thumbnail, a raised card, and the
 * position in the header. While the remote is elsewhere the row keeps that
 * chapter in view, so opening the panel shows where the video is.
 */
export function VideoChapterList({chapters, onPress}: VideoChapterListProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const {metrics, contentPadding} = useFeedGeometry();
  const currentTime = usePlaybackTime();
  const listRef = useRef<FlatList<YTChapter>>(null);
  const focusedInside = useRef(false);
  const focusGuideRef = useRef<View & FocusGuideMethods>(null);

  const padding = useMemo(
    () => getFeedRowPadding(contentPadding, theme.spacing.sm),
    [contentPadding, theme.spacing.sm],
  );
  const cardWidth = metrics.shelfCardWidth;
  const videoDuration = chapters[chapters.length - 1]?.endDuration ?? 0;

  const activeIndex = findActiveChapterIndex(chapters, currentTime);
  const activeProgress =
    activeIndex >= 0 && currentTime !== undefined
      ? getChapterProgress(chapters[activeIndex], currentTime)
      : 0;

  // Cards have a fixed width, so their offsets are known up front. That lets
  // the row scroll to a chapter it has not rendered yet.
  const getItemLayout = useCallback(
    (_: ArrayLike<YTChapter> | null | undefined, index: number) => ({
      length: cardWidth + metrics.gap,
      offset: padding.paddingStart + index * (cardWidth + metrics.gap),
      index,
    }),
    [cardWidth, metrics.gap, padding.paddingStart],
  );

  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  const scrollToActive = useCallback(() => {
    // Never move the row under the remote; that would scroll the focused card
    // away while it is being read.
    if (activeIndexRef.current < 0 || focusedInside.current) {
      return;
    }

    listRef.current?.scrollToIndex({
      index: activeIndexRef.current,
      animated: true,
      // Keep the card on the row's leading edge instead of the screen's.
      viewOffset: padding.paddingStart,
    });
  }, [padding.paddingStart]);

  useEffect(scrollToActive, [activeIndex, scrollToActive]);

  // Moving between two cards blurs one before the next one is focused, so
  // leaving the row is only certain once no card took focus shortly after.
  const blurTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(blurTimeout.current), []);

  const onCardFocusChange = useCallback(
    (focused: boolean) => {
      focusedInside.current = focused;
      clearTimeout(blurTimeout.current);

      if (!focused) {
        // Bring the playing chapter back after browsing, so the row shows
        // where the video is the next time the panel opens.
        blurTimeout.current = setTimeout(scrollToActive, 150);
      }
    },
    [scrollToActive],
  );

  // Entering the row lands on the playing chapter rather than the first or
  // the last focused one; the row is already scrolled there. Destinations win
  // over the guide's focus memory. While the active card is not mounted they
  // are cleared, and `autoFocus` keeps the guide installed as the fallback —
  // without it an empty list would turn the guide into a focus trap.
  const activeCard = useRef<View | null>(null);
  const setActiveCard = useCallback((card: View | null) => {
    activeCard.current = card;
    focusGuideRef.current?.setDestinations(card ? [card] : []);
  }, []);

  // On mount the card's ref is attached before the guide's, so the first
  // destination has to be applied once both exist.
  useEffect(() => {
    if (activeCard.current) {
      focusGuideRef.current?.setDestinations([activeCard.current]);
    }
  }, []);

  const renderItem = useCallback<ListRenderItem<YTChapter>>(
    ({item, index}) => (
      <ChapterCard
        active={index === activeIndex}
        cardRef={index === activeIndex ? setActiveCard : undefined}
        chapter={item}
        onFocusChange={onCardFocusChange}
        onPress={onPress}
        progress={index === activeIndex ? activeProgress : undefined}
        videoDuration={videoDuration}
        width={cardWidth}
      />
    ),
    [
      activeIndex,
      activeProgress,
      cardWidth,
      onCardFocusChange,
      onPress,
      setActiveCard,
      videoDuration,
    ],
  );

  const keyExtractor = useCallback(
    (item: YTChapter, index: number) => `${item.startDuration}-${index}`,
    [],
  );

  return (
    // The guide spans the header too. A guide only as tall as the cards ties
    // with them, and the focus engine then takes the card right below the
    // seek bar instead of the guide's destination.
    <TVFocusGuideView
      autoFocus
      ref={focusGuideRef}
      style={[styles.container, {gap: theme.spacing.sm}]}>
      <View
        style={[
          styles.header,
          padding,
          {gap: theme.spacing.md, marginBottom: theme.spacing.xs},
        ]}>
        <AppText accessibilityRole={"header"} variant={"titleMedium"}>
          {t("video.chapters")}
        </AppText>
        {activeIndex >= 0 ? (
          <AppText color={"textSecondary"} variant={"bodySmall"}>
            {t("video.chapters.position", {
              index: activeIndex + 1,
              total: chapters.length,
            })}
          </AppText>
        ) : null}
      </View>
      <FlatList
        contentContainerStyle={{gap: metrics.gap, ...padding}}
        data={chapters}
        extraData={activeProgress}
        getItemLayout={getItemLayout}
        horizontal
        keyExtractor={keyExtractor}
        onScrollToIndexFailed={() => undefined}
        ref={listRef}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={!Platform.isTV}
        testID={"video-chapters"}
      />
    </TVFocusGuideView>
  );
}

interface ChapterCardProps {
  chapter: YTChapter;
  width: number;
  active: boolean;
  /** Progress through the chapter, only set on the active one. */
  progress?: number;
  videoDuration: number;
  onPress?: (chapter: YTChapter) => void;
  onFocusChange: (focused: boolean) => void;
  /** Set on the active card only; it becomes the row's focus destination. */
  cardRef?: (card: View | null) => void;
}

/**
 * A chapter in the look of the TV media card: focus is an outline plus a scale
 * transform inside the card's own frame, so focus never moves the neighbors.
 * See `MediaCard.tv.tsx` for why the frame is inset by the growth.
 */
const ChapterCard = React.memo(function ChapterCard({
  chapter,
  width,
  active,
  progress,
  videoDuration,
  onPress,
  onFocusChange,
  cardRef,
}: ChapterCardProps) {
  const {theme, reduceMotion} = useAppTheme();
  const {t} = useTranslation();
  const {onElementFocused} = useShelfVideoSelector();
  const [focused, setFocused] = useState(false);
  const [cardHeight, setCardHeight] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  const thumbnailUrl = chapter.thumbnailImage?.url;
  const start = formatChapterTimestamp(chapter.startDuration, videoDuration);
  const length = formatChapterTimestamp(
    chapter.endDuration - chapter.startDuration,
    videoDuration,
  );

  useEffect(() => {
    setImageFailed(false);
  }, [thumbnailUrl]);

  // Two title lines plus the timestamp, reserved for every card so a short
  // title does not make its focus outline shorter than the neighbors'.
  const textBlockHeight =
    theme.typography.titleSmall.lineHeight * 2 +
    theme.typography.bodySmall.lineHeight;
  const growth = theme.motion.tvFocusScale - 1;
  const insetX = Math.ceil((width * growth) / 2);
  const insetY = Math.ceil((cardHeight * growth) / 2);

  const animateTo = (value: number) => {
    if (reduceMotion) {
      scale.setValue(1);
      return;
    }

    Animated.timing(scale, {
      toValue: value,
      duration: theme.motion.duration.standard,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      accessibilityHint={t("video.chapters.accessibilityHint")}
      accessibilityLabel={
        active
          ? t("video.chapters.accessibilityLabelActive", {title: chapter.title})
          : t("video.chapters.accessibilityLabel", {
              title: chapter.title,
              time: start,
            })
      }
      accessibilityRole={"button"}
      accessibilityState={{selected: active}}
      onBlur={() => {
        setFocused(false);
        onFocusChange(false);
        animateTo(1);
      }}
      onFocus={() => {
        setFocused(true);
        onFocusChange(true);
        animateTo(theme.motion.tvFocusScale);
        onElementFocused?.();
      }}
      onPress={() => onPress?.(chapter)}
      ref={cardRef}
      style={{width, paddingHorizontal: insetX, paddingVertical: insetY}}>
      <Animated.View
        onLayout={event => {
          const {height} = event.nativeEvent.layout;

          setCardHeight(previous => (previous === height ? previous : height));
        }}
        style={{
          gap: theme.spacing.sm,
          padding: theme.spacing.sm,
          borderRadius: theme.radii.panel,
          borderWidth: theme.controls.focusBorderWidth,
          borderColor: focused ? theme.colors.focus : theme.colors.focusResting,
          // The playing chapter stays raised while the remote is elsewhere;
          // focus raises it further, so both states remain distinguishable.
          backgroundColor: focused
            ? theme.colors.surfacePressed
            : active
              ? theme.colors.surfaceRaised
              : "transparent",
          transform: [{scale}],
        }}>
        <View
          style={[
            styles.thumbnail,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderRadius: theme.radii.card,
            },
          ]}>
          {thumbnailUrl && !imageFailed ? (
            <Image
              accessibilityIgnoresInvertColors
              contentFit={"cover"}
              onError={() => setImageFailed(true)}
              recyclingKey={`${chapter.startDuration}`}
              source={{uri: thumbnailUrl}}
              style={styles.image}
            />
          ) : (
            <View style={styles.fallback}>
              <MaterialIcons
                color={theme.colors.textDisabled}
                name={"bookmark-border"}
                size={64}
              />
            </View>
          )}
          {active ? (
            <View
              style={[
                styles.badge,
                styles.leadingBadge,
                {
                  start: theme.spacing.md,
                  bottom: theme.spacing.md,
                  backgroundColor: theme.colors.mediaProgress,
                  borderRadius: theme.radii.control,
                  paddingHorizontal: theme.spacing.sm,
                  paddingVertical: theme.spacing.xs / 2,
                  gap: theme.spacing.xs,
                },
              ]}>
              <MaterialIcons
                color={theme.colors.textPrimary}
                name={"play-arrow"}
                size={20}
              />
              <AppText variant={"label"}>
                {t("video.chapters.nowPlaying")}
              </AppText>
            </View>
          ) : null}
          <View
            style={[
              styles.badge,
              {
                end: theme.spacing.md,
                bottom: theme.spacing.md,
                backgroundColor: theme.colors.scrim,
                borderRadius: theme.radii.control,
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: theme.spacing.xs / 2,
              },
            ]}>
            <AppText variant={"label"}>{length}</AppText>
          </View>
          {progress !== undefined ? (
            <View
              style={[
                styles.progressTrack,
                {backgroundColor: theme.colors.scrim},
              ]}>
              <View
                style={{
                  width: `${progress * 100}%`,
                  height: "100%",
                  backgroundColor: theme.colors.mediaProgress,
                }}
              />
            </View>
          ) : null}
        </View>
        <View style={{minHeight: textBlockHeight}}>
          <AppText numberOfLines={2} variant={"titleSmall"}>
            {chapter.title}
          </AppText>
          <AppText
            color={"textSecondary"}
            numberOfLines={1}
            variant={"bodySmall"}>
            {t("video.chapters.start", {time: start})}
          </AppText>
        </View>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  thumbnail: {
    width: "100%",
    aspectRatio: 16 / 9,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  fallback: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
  },
  leadingBadge: {
    // The duration badge sits on the same line; the label gives way first.
    maxWidth: "70%",
  },
  progressTrack: {
    position: "absolute",
    start: 0,
    end: 0,
    bottom: 0,
    height: 6,
  },
});
