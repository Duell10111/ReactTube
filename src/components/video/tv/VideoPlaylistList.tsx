import React, {useCallback, useEffect, useMemo, useRef} from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  TVFocusGuideView,
  View,
  type FocusGuideMethods,
  type ListRenderItem,
} from "react-native";

import {ElementData} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import {AppText} from "@/ui/components";
import {useAppChrome} from "@/ui/layout";
import {
  MediaCard,
  getFeedRowPadding,
  getShelfListPerformance,
  useFeedGeometry,
} from "@/ui/patterns";
import {useAppTheme} from "@/ui/theme";

interface VideoPlaylistListProps {
  playlist: {
    title: string;
    elements: ElementData[];
  };
  /** Index of the playing video in `elements`, or -1 if it is not among them. */
  currentIndex: number;
}

/**
 * The playlist the video is playing in, as a row under the player controls.
 *
 * It renders the same media cards as the related videos below it and marks
 * the entry that is playing: a badge on its thumbnail, a raised card, and the
 * position in the header. While the remote is elsewhere the row keeps that
 * entry in view, so opening the panel shows where the playlist stands.
 */
export function VideoPlaylistList({
  playlist,
  currentIndex,
}: VideoPlaylistListProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const {layout} = useAppChrome();
  const {metrics, contentPadding} = useFeedGeometry();
  const performance = getShelfListPerformance(layout);
  const listRef = useRef<FlatList<ElementData>>(null);
  const focusedInside = useRef(false);
  const focusGuideRef = useRef<View & FocusGuideMethods>(null);

  const padding = useMemo(
    () => getFeedRowPadding(contentPadding, theme.spacing.sm),
    [contentPadding, theme.spacing.sm],
  );
  const cardWidth = metrics.shelfCardWidth;

  // Cards have a fixed width, so their offsets are known up front. That lets
  // the row scroll to an entry it has not rendered yet.
  const getItemLayout = useCallback(
    (_: ArrayLike<ElementData> | null | undefined, index: number) => ({
      length: cardWidth + metrics.gap,
      offset: padding.paddingStart + index * (cardWidth + metrics.gap),
      index,
    }),
    [cardWidth, metrics.gap, padding.paddingStart],
  );

  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  const scrollToCurrent = useCallback(
    (animated = true) => {
      // Never move the row under the remote; that would scroll the focused
      // card away while it is being read.
      if (currentIndexRef.current < 0 || focusedInside.current) {
        return;
      }

      listRef.current?.scrollToIndex({
        index: currentIndexRef.current,
        animated,
        // Keep the card on the row's leading edge instead of the screen's.
        viewOffset: padding.paddingStart,
      });
    },
    [padding.paddingStart],
  );

  // The first pass jumps, so the row opens on the playing entry instead of
  // visibly scrolling there; later changes animate.
  const scrolledOnce = useRef(false);
  useEffect(() => {
    scrollToCurrent(scrolledOnce.current);
    scrolledOnce.current = true;
  }, [currentIndex, scrollToCurrent]);

  // Moving between two cards blurs one before the next one is focused, so
  // leaving the row is only certain once no card took focus shortly after.
  const blurTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(blurTimeout.current), []);

  const onCardFocusChange = useCallback(
    (focused: boolean) => {
      focusedInside.current = focused;
      clearTimeout(blurTimeout.current);

      if (!focused) {
        // Bring the playing entry back after browsing, so the row shows
        // where the playlist stands the next time the panel opens.
        blurTimeout.current = setTimeout(() => scrollToCurrent(), 150);
      }
    },
    [scrollToCurrent],
  );

  // Entering the row lands on the playing entry rather than the first or the
  // last focused one; the row is already scrolled there. Destinations win over
  // the guide's focus memory. While that card is not mounted they are cleared,
  // and `autoFocus` keeps the guide installed as the fallback — without it an
  // empty list would turn the guide into a focus trap.
  const currentCard = useRef<View | null>(null);
  const setCurrentCard = useCallback((card: View | null) => {
    currentCard.current = card;
    focusGuideRef.current?.setDestinations(card ? [card] : []);
  }, []);

  // On mount the card's ref is attached before the guide's, so the first
  // destination has to be applied once both exist.
  useEffect(() => {
    if (currentCard.current) {
      focusGuideRef.current?.setDestinations([currentCard.current]);
    }
  }, []);

  const nowPlaying = t("video.queue.nowPlaying");

  const renderItem = useCallback<ListRenderItem<ElementData>>(
    ({item, index}) => (
      <MediaCard
        element={item}
        focusRef={index === currentIndex ? setCurrentCard : undefined}
        onFocusChange={onCardFocusChange}
        selected={index === currentIndex}
        selectedLabel={nowPlaying}
        width={cardWidth}
      />
    ),
    [cardWidth, currentIndex, nowPlaying, onCardFocusChange, setCurrentCard],
  );

  // The same video can appear twice in a playlist, so the index is part of
  // the key.
  const keyExtractor = useCallback(
    (item: ElementData, index: number) => `${item.id}-${index}`,
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
        <AppText
          accessibilityRole={"header"}
          numberOfLines={1}
          style={styles.title}
          variant={"titleMedium"}>
          {playlist.title}
        </AppText>
        {currentIndex >= 0 ? (
          <AppText color={"textSecondary"} variant={"bodySmall"}>
            {t("video.queue.position", {
              index: currentIndex + 1,
              total: playlist.elements.length,
            })}
          </AppText>
        ) : null}
      </View>
      <FlatList
        contentContainerStyle={{gap: metrics.gap, ...padding}}
        data={playlist.elements}
        extraData={currentIndex}
        getItemLayout={getItemLayout}
        horizontal
        initialNumToRender={performance.initialNumToRender}
        keyExtractor={keyExtractor}
        maxToRenderPerBatch={performance.maxToRenderPerBatch}
        onScrollToIndexFailed={() => undefined}
        ref={listRef}
        removeClippedSubviews={performance.removeClippedSubviews}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={!Platform.isTV}
        testID={"video-playlist"}
        updateCellsBatchingPeriod={performance.updateCellsBatchingPeriod}
        windowSize={performance.windowSize}
      />
    </TVFocusGuideView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  title: {
    flexShrink: 1,
  },
});
