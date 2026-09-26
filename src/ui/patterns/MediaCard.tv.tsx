import React, {useMemo, useRef, useState} from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import {MediaCardThumbnail} from "./MediaCardThumbnail";
import {createMediaCardViewModel} from "./mediaCardModel";
import {useMediaCardPress} from "./useMediaCardPress";

import {useShelfVideoSelector} from "@/context/ShelfVideoSelector";
import type {ElementData} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import {AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";
import {useTVRemoteEvent} from "@/ui/tv";

export interface MediaCardProps {
  element: ElementData;
  width?: DimensionValue;
  onPress?: () => void;
  onLongPress?: () => void;
  onOverflow?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * TV media card. Selection and focus are rendered as an outline plus a scale
 * transform, so a focused card never moves its neighbors.
 *
 * The growth happens inside the frame the feed assigns to the card: the card
 * is inset by exactly the amount it grows by, so the focused card fills its
 * frame instead of spilling out of it. Spilling out was invisible in a grid
 * row but clipped in a shelf, whose horizontal list cuts everything outside
 * its own bounds — the top and bottom of the focus outline went missing.
 */
function MediaCardTV({
  element,
  width,
  onPress,
  onLongPress,
  style,
  testID,
}: MediaCardProps) {
  const {theme, reduceMotion} = useAppTheme();
  const {t} = useTranslation();
  const {setSelectedVideo, onElementFocused} = useShelfVideoSelector();
  const defaultPress = useMediaCardPress(element);
  const [focused, setFocused] = useState(false);
  const [cardHeight, setCardHeight] = useState(0);
  const scale = useRef(new Animated.Value(1)).current;
  const model = useMemo(
    () => createMediaCardViewModel(element, {translate: t}),
    [element, t],
  );

  // Two title lines plus one metadata line, reserved whether the entry fills
  // them or not. Without the reservation a one-line title makes the card, and
  // with it the focus outline, visibly shorter than its neighbors in the same
  // row — which reads as the outline changing size while focus moves.
  const textBlockHeight =
    theme.typography.titleSmall.lineHeight * 2 +
    theme.typography.bodySmall.lineHeight;

  /** Reserved in every state so focus never changes the card geometry. */
  const focusBorderWidth = theme.controls.focusBorderWidth;
  const growth = theme.motion.tvFocusScale - 1;
  // The horizontal inset comes from the assigned width and the vertical one
  // from the measured card, because vertical padding cannot change how the
  // card's own text wraps. Neither feeds back into the layout it is read from.
  const insetX =
    typeof width === "number" ? Math.ceil((width * growth) / 2) : 0;
  const insetY = Math.ceil((cardHeight * growth) / 2);

  const openMenu = onLongPress ?? (() => setSelectedVideo(element));

  // The remote reports a long select as a TV event, not as a press gesture.
  // Only the focused card listens: a feed keeps dozens of cards mounted, and
  // every one of them subscribing meant every key press walked all of them.
  useTVRemoteEvent(event => {
    if (event.eventType === "longSelect") {
      openMenu();
    }
  }, focused);

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
      accessibilityHint={model.accessibilityHint}
      accessibilityLabel={model.accessibilityLabel}
      accessibilityRole={"button"}
      onBlur={() => {
        setFocused(false);
        animateTo(1);
      }}
      onFocus={() => {
        setFocused(true);
        animateTo(theme.motion.tvFocusScale);
        onElementFocused?.();
      }}
      onLongPress={openMenu}
      onPress={onPress ?? defaultPress}
      style={[
        styles.container,
        {width, paddingHorizontal: insetX, paddingVertical: insetY},
        style,
      ]}
      testID={testID ?? "media-card"}>
      <Animated.View
        onLayout={event => {
          const {height} = event.nativeEvent.layout;

          setCardHeight(previous => (previous === height ? previous : height));
        }}
        style={[
          styles.card,
          {
            gap: theme.spacing.sm,
            padding: theme.spacing.sm,
            borderRadius: theme.radii.panel,
            borderWidth: focusBorderWidth,
            borderColor: focused
              ? theme.colors.focus
              : theme.colors.focusResting,
            backgroundColor: focused
              ? theme.colors.surfaceRaised
              : "transparent",
            transform: [{scale}],
          },
        ]}>
        <MediaCardThumbnail
          model={model}
          scale={"tv"}
          targetWidth={typeof width === "number" ? width : undefined}
        />
        <View style={[styles.metadata, {minHeight: textBlockHeight}]}>
          <AppText numberOfLines={2} variant={"titleSmall"}>
            {model.title}
          </AppText>
          <AppText
            color={"textSecondary"}
            numberOfLines={1}
            variant={"bodySmall"}>
            {model.metadataLine}
          </AppText>
        </View>
      </Animated.View>
    </Pressable>
  );
}

/**
 * A feed row re-renders whenever the feed does, and a TV feed re-renders on
 * every focus move. Memoizing the card keeps that to the two cards whose focus
 * actually changed instead of the whole visible grid.
 */
export const MediaCard = React.memo(MediaCardTV);

MediaCard.displayName = "MediaCard";

const styles = StyleSheet.create({
  container: {
    flexShrink: 1,
  },
  card: {
    flexShrink: 1,
  },
  metadata: {
    width: "100%",
  },
});
