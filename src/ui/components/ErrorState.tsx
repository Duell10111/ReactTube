import {MaterialIcons} from "@expo/vector-icons";
import React from "react";
import {StyleSheet, View} from "react-native";

import {AppButton} from "./AppButton";
import {AppText} from "./AppText";

import {useTranslation} from "@/localization";
import {useAppTheme} from "@/ui/theme";

interface ErrorStateProps {
  title?: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title,
  message,
  retryLabel,
  onRetry,
}: ErrorStateProps) {
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  return (
    <View
      accessibilityRole={"alert"}
      style={[
        styles.container,
        {gap: theme.spacing.md, padding: theme.spacing.xl},
      ]}>
      <MaterialIcons
        color={theme.colors.error}
        name={"error-outline"}
        size={48}
      />
      <AppText align={"center"} variant={"titleMedium"}>
        {title ?? t("state.error.title")}
      </AppText>
      <AppText align={"center"} color={"textSecondary"}>
        {message ?? t("state.error.message")}
      </AppText>
      {onRetry ? (
        <AppButton
          label={retryLabel ?? t("common.retry")}
          onPress={onRetry}
          variant={"secondary"}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
