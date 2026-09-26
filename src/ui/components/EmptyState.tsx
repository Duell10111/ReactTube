import {MaterialIcons} from "@expo/vector-icons";
import React from "react";
import {StyleSheet, View} from "react-native";

import {AppButton} from "./AppButton";
import {AppText} from "./AppText";

import {useTranslation} from "@/localization";
import {useAppTheme} from "@/ui/theme";

interface EmptyStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  return (
    <View
      accessibilityRole={"summary"}
      style={[
        styles.container,
        {gap: theme.spacing.md, padding: theme.spacing.xl},
      ]}>
      <MaterialIcons
        color={theme.colors.textSecondary}
        name={"inbox"}
        size={48}
      />
      <AppText align={"center"} variant={"titleMedium"}>
        {title ?? t("state.empty.title")}
      </AppText>
      <AppText align={"center"} color={"textSecondary"}>
        {message ?? t("state.empty.message")}
      </AppText>
      {onAction ? (
        <AppButton
          label={actionLabel ?? t("common.continue")}
          onPress={onAction}
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
