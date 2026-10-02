import {MaterialIcons} from "@expo/vector-icons";
import {Image} from "expo-image";
import React, {useRef, useState} from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import type {YTEndscreenElement} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import {AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

interface EndscreenCardProps {
  element: YTEndscreenElement;
  /**
   * `overlay` sits on the video where the creator placed it and names itself
   * only while focused. `row` is a card in the end screen's row and always
   * carries its title underneath, like a media card.
   */
  variant: "overlay" | "row";
  /** A passive card is only a picture; it never takes the remote's focus. */
  interactive: boolean;
  onPress: (element: YTEndscreenElement) => void;
  hasTVPreferredFocus?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * One of the creator's end cards. Focus looks the way it does on a media card
 * — outline plus a slight scale — so the end of a video does not introduce a
 * focus style of its own.
 */
export function EndscreenCard({
  element,
  variant,
  interactive,
  onPress,
  hasTVPreferredFocus,
  style,
}: EndscreenCardProps) {
  const {theme, reduceMotion} = useAppTheme();
  const {t} = useTranslation();
  const [focused, setFocused] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  const circle = element.style === "CHANNEL";
  const radius = circle ? theme.radii.round : theme.radii.card;
  const typeLabel =
    element.style === "CHANNEL"
      ? t("video.endscreen.channel")
      : element.style === "PLAYLIST"
        ? t("video.endscreen.playlist")
        : undefined;
  const title = element.title ?? typeLabel ?? "";
  const showOverlayTitle = variant === "overlay" && focused && title;

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

  const artwork = (
    <Animated.View
      style={[
        styles.artwork,
        {
          aspectRatio: element.aspect_ratio || (circle ? 1 : 16 / 9),
          borderRadius: radius,
          borderWidth: theme.controls.focusBorderWidth,
          borderColor: focused ? theme.colors.focus : theme.colors.focusResting,
          transform: [{scale}],
        },
      ]}>
      <Image
        contentFit={"cover"}
        source={
          element.thumbnailImage
            ? {uri: element.thumbnailImage.url}
            : require("../../../../assets/grey-background.jpg")
        }
        style={[StyleSheet.absoluteFill, {borderRadius: radius}]}
      />
      {element.style === "PLAYLIST" ? (
        <View
          style={[
            styles.playlistBadge,
            {
              backgroundColor: theme.colors.scrim,
              borderRadius: theme.radii.control,
              margin: theme.spacing.sm,
              padding: theme.spacing.xs,
            },
          ]}>
          <MaterialIcons
            color={theme.colors.textPrimary}
            name={"playlist-play"}
            size={theme.controls.iconSize}
          />
        </View>
      ) : null}
      {showOverlayTitle ? (
        <View
          pointerEvents={"none"}
          style={circle ? styles.channelTitle : styles.videoTitle}>
          <View
            style={{
              backgroundColor: theme.colors.scrim,
              borderRadius: theme.radii.control,
              margin: theme.spacing.sm,
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.xs,
            }}>
            <AppText
              align={circle ? "center" : undefined}
              numberOfLines={2}
              variant={"label"}>
              {title}
            </AppText>
          </View>
        </View>
      ) : null}
    </Animated.View>
  );

  const content =
    variant === "row" ? (
      <View style={{gap: theme.spacing.sm}}>
        {artwork}
        <AppText
          align={circle ? "center" : undefined}
          numberOfLines={2}
          variant={"titleSmall"}>
          {title}
        </AppText>
      </View>
    ) : (
      artwork
    );

  if (!interactive) {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility={"no-hide-descendants"}
        style={style}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityHint={typeLabel}
      accessibilityLabel={title}
      accessibilityRole={"button"}
      hasTVPreferredFocus={hasTVPreferredFocus}
      onBlur={() => {
        setFocused(false);
        animateTo(1);
      }}
      onFocus={() => {
        setFocused(true);
        animateTo(theme.motion.tvFocusScale);
      }}
      onPress={() => onPress(element)}
      style={style}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  artwork: {
    width: "100%",
    overflow: "visible",
  },
  // Top corner, so the focused title along the bottom never covers it.
  playlistBadge: {
    position: "absolute",
    top: 0,
    right: 0,
  },
  videoTitle: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  // A channel is a circle; its name hangs centered below it instead of
  // covering the face, and may be wider than the circle.
  channelTitle: {
    position: "absolute",
    top: "100%",
    left: "-50%",
    right: "-50%",
    alignItems: "center",
  },
});
