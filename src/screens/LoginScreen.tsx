import React, {useEffect} from "react";
import {Linking, Platform, StyleSheet, View} from "react-native";
import QRCode from "react-native-qrcode-svg";

import {useAccountContext} from "@/context/AccountContext";
import {useTranslation} from "@/localization";
import {AppButton, AppText, Screen} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

const Clipboard = !Platform.isTV ? require("expo-clipboard") : {};

export default function LoginScreen() {
  const account = useAccountContext();
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  useEffect(() => {
    if (!Platform.isTV && account?.qrCode) {
      Clipboard.setStringAsync(account.qrCode.user_code);
    }
  }, [account?.qrCode]);

  return (
    <Screen
      contentContainerStyle={[
        styles.container,
        {gap: theme.spacing.xl, padding: theme.spacing.xl},
      ]}
      scroll>
      {account?.qrCode ? (
        <View
          style={[
            styles.loginContainer,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderRadius: theme.radii.panel,
              gap: theme.spacing.lg,
              padding: theme.spacing.xl,
            },
          ]}>
          <View style={[styles.qr, {backgroundColor: theme.colors.focus}]}>
            <QRCode
              value={account.qrCode.verification_url}
              size={Platform.isTV ? 420 : 240}
              backgroundColor={theme.colors.focus}
              color={theme.colors.background}
            />
          </View>
          <AppText align={"center"} variant={"titleMedium"}>
            {t("login.code", {code: account.qrCode.user_code})}
          </AppText>
        </View>
      ) : (
        <View style={styles.loginContainer}>
          <AppText align={"center"} variant={"titleMedium"}>
            {t("login.waiting.title")}
          </AppText>
          <AppText align={"center"} color={"textSecondary"}>
            {t("login.waiting.message")}
          </AppText>
        </View>
      )}
      <AppButton
        fullWidth
        label={t("login.start")}
        onPress={() => account?.login()}
      />
      {!Platform.isTV ? (
        <AppButton
          disabled={!account?.qrCode?.verification_url}
          fullWidth
          label={t("login.openPage")}
          onPress={() => {
            if (account?.qrCode?.verification_url)
              Linking.openURL(account?.qrCode?.verification_url).catch(
                console.warn,
              );
          }}
          variant={"secondary"}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
  },
  loginContainer: {
    alignItems: "center",
  },
  qr: {
    padding: 8,
  },
});
