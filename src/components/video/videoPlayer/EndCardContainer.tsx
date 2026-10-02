import {MaterialIcons} from "@expo/vector-icons";
import React from "react";
import {StyleSheet, TVFocusGuideView, View} from "react-native";
import Animated, {FadeIn, FadeOut} from "react-native-reanimated";

import {useTranslation} from "@/localization";
import {AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";
import {useTVOverscanInsets} from "@/ui/tv";

interface EndCardContainerProps {
  children: React.ReactNode;
  /** Whether the end cards are on screen at all. */
  visible: boolean;
  /** Whether the end cards own the remote. */
  browsing: boolean;
  /** The hint stays out of the way while the player controls are up. */
  controlsVisible: boolean;
}

/**
 * Frame around the creator's end cards. While the video plays the cards are
 * passive and a small hint says how to reach them; in browse mode a light scrim
 * sets them apart from the video and a focus guide keeps the remote on them,
 * so it cannot slip into the hidden player controls underneath.
 */
export default function EndCardContainer({
  children,
  visible,
  browsing,
  controlsVisible,
}: EndCardContainerProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const overscan = useTVOverscanInsets();

  if (!visible) {
    return null;
  }

  const showHint = browsing || !controlsVisible;

  return (
    <Animated.View
      entering={FadeIn.duration(theme.motion.duration.deliberate)}
      exiting={FadeOut.duration(theme.motion.duration.standard)}
      pointerEvents={"box-none"}
      style={StyleSheet.absoluteFill}>
      {browsing ? (
        <Animated.View
          entering={FadeIn.duration(theme.motion.duration.standard)}
          exiting={FadeOut.duration(theme.motion.duration.standard)}
          pointerEvents={"none"}
          style={[StyleSheet.absoluteFill, styles.browseScrim]}
        />
      ) : null}
      {/*
       * One guide in both states, so entering browse mode does not remount
       * the cards and replay their fade. Without `autoFocus` it installs no
       * focus guide and is a plain view; the traps only matter once it does.
       */}
      <TVFocusGuideView
        autoFocus={browsing}
        pointerEvents={"box-none"}
        style={StyleSheet.absoluteFill}
        trapFocusDown={browsing}
        trapFocusLeft={browsing}
        trapFocusRight={browsing}
        trapFocusUp={browsing}>
        {children}
      </TVFocusGuideView>
      {showHint ? (
        <View
          pointerEvents={"none"}
          style={[
            styles.hint,
            {
              left: overscan.left,
              bottom: overscan.bottom,
              gap: theme.spacing.xs,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.xs,
              borderRadius: theme.radii.round,
              backgroundColor: theme.colors.scrim,
            },
          ]}>
          <MaterialIcons
            color={theme.colors.textPrimary}
            name={browsing ? "arrow-back" : "keyboard-arrow-up"}
            size={theme.controls.iconSize}
          />
          <AppText variant={"label"}>
            {browsing ? t("video.endscreen.exit") : t("video.endscreen.browse")}
          </AppText>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Lighter than the theme scrim: the video keeps playing behind the cards.
  browseScrim: {
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  hint: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
  },
});
