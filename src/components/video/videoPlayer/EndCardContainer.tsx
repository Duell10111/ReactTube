import {MaterialIcons} from "@expo/vector-icons";
import React, {useEffect, useState} from "react";
import {Pressable, StyleSheet} from "react-native";
import Animated, {
  SharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

import {useTranslation} from "@/localization";
import {AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

interface EndCardContainerProps {
  children: React.ReactNode;
  showEndCard: SharedValue<boolean>;
  /** Mirrors `showEndCard` for rendering decisions on the JS side. */
  visible: boolean;
  onCloseEndCard?: () => void;
}

/** Matches the default `withTiming` duration of the fade below. */
const FADE_OUT_MS = 300;

export default function EndCardContainer({
  children,
  showEndCard,
  visible,
  onCloseEndCard,
}: EndCardContainerProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  // A faded-out end card stayed mounted and focusable, so the remote could
  // land on its invisible items. It now leaves the tree once the fade is done.
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      return;
    }
    const timeout = setTimeout(() => setMounted(false), FADE_OUT_MS);
    return () => clearTimeout(timeout);
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(showEndCard.value ? 1 : 0),
    };
  });

  if (!mounted) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {children}
      <Pressable
        accessibilityLabel={t("common.close")}
        accessibilityRole={"button"}
        onPress={onCloseEndCard}
        style={styles.closeContainer}>
        <AppText variant={"label"}>{t("common.close")}</AppText>
        <MaterialIcons
          color={theme.colors.textPrimary}
          name={"keyboard-arrow-down"}
          size={35}
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Close Container
  closeContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
});
