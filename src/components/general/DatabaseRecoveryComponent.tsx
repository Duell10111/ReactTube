import {MaterialIcons} from "@expo/vector-icons";
import React, {useCallback, useState} from "react";
import {Alert, Platform, ScrollView, StyleSheet, View} from "react-native";

import {useTranslation} from "@/localization";
import {AppButton, AppText, Screen} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";
import Logger from "@/utils/Logger";

const Clipboard = !Platform.isTV ? require("expo-clipboard") : {};

const LOGGER = Logger.extend("DB-RECOVERY-UI");

interface Props {
  error?: Error;
  diagnostics?: string;
  busy: boolean;
  onRetry: () => void;
  onRepair: () => void;
  onReset: () => void;
}

/**
 * Shown when the local download database cannot be migrated. Offers the
 * recovery paths so a broken database does not permanently block the app.
 */
export default function DatabaseRecoveryComponent({
  error,
  diagnostics,
  busy,
  onRetry,
  onRepair,
  onReset,
}: Props) {
  const {t} = useTranslation();
  const {theme} = useAppTheme();
  const [detailsVisible, setDetailsVisible] = useState(false);

  const details = [error?.message, diagnostics].filter(Boolean).join("\n\n");

  const copyDetails = useCallback(() => {
    Clipboard.setStringAsync?.(details)?.catch(LOGGER.warn);
  }, [details]);

  const confirmReset = useCallback(() => {
    Alert.alert(
      t("database.reset.confirmTitle"),
      t("database.reset.confirmMessage"),
      [
        {text: t("common.close"), style: "cancel"},
        {
          text: t("database.action.reset"),
          style: "destructive",
          onPress: onReset,
        },
      ],
    );
  }, [onReset, t]);

  return (
    <Screen scroll>
      <View
        accessibilityRole={"alert"}
        style={[styles.container, {gap: theme.spacing.md}]}>
        <MaterialIcons
          color={theme.colors.error}
          name={"error-outline"}
          size={48}
        />
        <AppText align={"center"} variant={"titleMedium"}>
          {t("database.error.title")}
        </AppText>
        <AppText align={"center"} color={"textSecondary"} numberOfLines={0}>
          {busy ? t("database.error.repairing") : t("database.error.message")}
        </AppText>
        {error ? (
          <AppText align={"center"} color={"error"} numberOfLines={0}>
            {error.message}
          </AppText>
        ) : null}
        <AppText
          align={"center"}
          color={"textSecondary"}
          numberOfLines={0}
          variant={"bodySmall"}>
          {t("database.repair.hint")}
        </AppText>

        <View style={[styles.actions, {gap: theme.spacing.sm}]}>
          <AppButton
            disabled={busy}
            label={t("database.action.retry")}
            onPress={onRetry}
            variant={"secondary"}
          />
          <AppButton
            disabled={busy}
            label={t("database.action.repair")}
            loading={busy}
            onPress={onRepair}
          />
          <AppButton
            disabled={busy}
            label={t("database.action.reset")}
            onPress={confirmReset}
            variant={"danger"}
          />
        </View>

        {details ? (
          <View style={[styles.actions, {gap: theme.spacing.sm}]}>
            <AppButton
              label={
                detailsVisible
                  ? t("database.action.hideDetails")
                  : t("database.action.details")
              }
              onPress={() => setDetailsVisible(visible => !visible)}
              variant={"secondary"}
            />
            {detailsVisible ? (
              <>
                <ScrollView
                  horizontal
                  style={[
                    styles.details,
                    {
                      backgroundColor: theme.colors.surfaceRaised,
                      borderRadius: theme.radii.card,
                      padding: theme.spacing.sm,
                    },
                  ]}>
                  <AppText
                    color={"textSecondary"}
                    numberOfLines={0}
                    variant={"bodySmall"}>
                    {details}
                  </AppText>
                </ScrollView>
                {Platform.isTV ? null : (
                  <AppButton
                    label={t("database.action.copyDetails")}
                    onPress={copyDetails}
                    variant={"secondary"}
                  />
                )}
              </>
            ) : null}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
  },
  actions: {
    alignSelf: "stretch",
  },
  details: {
    alignSelf: "stretch",
    maxHeight: 220,
  },
});
