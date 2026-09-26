import {MaterialIcons} from "@expo/vector-icons";
import React from "react";
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
  onCloseEndCard?: () => void;
}

export default function EndCardContainer({
  children,
  showEndCard,
  onCloseEndCard,
}: EndCardContainerProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(showEndCard.value ? 1 : 0),
    };
  });

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
