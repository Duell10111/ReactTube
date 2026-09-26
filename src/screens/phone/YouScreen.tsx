import {MaterialIcons} from "@expo/vector-icons";
import {useNavigation} from "@react-navigation/native";
import React from "react";
import {Pressable, StyleSheet, View} from "react-native";

import {useAccountContext} from "@/context/AccountContext";
import {useTranslation} from "@/localization";
import type {RootNavProp} from "@/navigation/RootStackNavigator";
import {AppButton, AppText, Divider, Screen} from "@/ui/components";
import type {AppIconName} from "@/ui/navigation";
import {useAppTheme} from "@/ui/theme";

interface YouRowProps {
  icon: AppIconName;
  label: string;
  onPress: () => void;
}

function YouRow({icon, label, onPress}: YouRowProps) {
  const {theme} = useAppTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole={"button"}
      onPress={onPress}
      style={({pressed}) => [
        styles.row,
        {
          backgroundColor: pressed
            ? theme.colors.surfacePressed
            : theme.colors.background,
          paddingHorizontal: theme.spacing.lg,
          gap: theme.spacing.lg,
        },
      ]}>
      <MaterialIcons color={theme.colors.textPrimary} name={icon} size={24} />
      <AppText numberOfLines={1} style={styles.rowLabel} variant={"body"}>
        {label}
      </AppText>
      <MaterialIcons
        color={theme.colors.textSecondary}
        name={"chevron-right"}
        size={24}
      />
    </Pressable>
  );
}

interface YouSectionProps {
  title: string;
  children: React.ReactNode;
}

function YouSection({title, children}: YouSectionProps) {
  const {theme} = useAppTheme();

  return (
    <View style={{paddingBottom: theme.spacing.lg}}>
      <AppText
        color={"textSecondary"}
        style={{
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.sm,
        }}
        variant={"labelSmall"}>
        {title}
      </AppText>
      {children}
      <Divider />
    </View>
  );
}

/**
 * Personal surface that collects account, history, library, transfers, and
 * settings so the main navigation can stay at five stable destinations.
 */
export default function YouScreen() {
  const {t} = useTranslation();
  const {theme} = useAppTheme();
  const {loginData} = useAccountContext();
  const navigation = useNavigation<RootNavProp>();
  const signedIn = loginData.accounts.length > 0;

  return (
    <Screen edges={["left", "right", "bottom"]} scroll>
      <YouSection title={t("you.account")}>
        {signedIn ? (
          <YouRow
            icon={"account-circle"}
            label={t("you.signedIn")}
            onPress={() => navigation.navigate("LoginScreen")}
          />
        ) : (
          <View
            style={{
              paddingHorizontal: theme.spacing.lg,
              paddingBottom: theme.spacing.md,
              gap: theme.spacing.sm,
            }}>
            <AppText variant={"titleSmall"}>{t("you.signedOut.title")}</AppText>
            <AppText color={"textSecondary"} variant={"bodySmall"}>
              {t("you.signedOut.message")}
            </AppText>
            <AppButton
              label={t("navigation.login")}
              onPress={() => navigation.navigate("LoginScreen")}
            />
          </View>
        )}
      </YouSection>
      <YouSection title={t("you.content")}>
        <YouRow
          icon={"history"}
          label={t("navigation.history")}
          onPress={() => navigation.navigate("History")}
        />
        {signedIn ? (
          <YouRow
            icon={"video-library"}
            label={t("navigation.library")}
            onPress={() => navigation.navigate("LibraryScreen")}
          />
        ) : null}
        <YouRow
          icon={"library-music"}
          label={t("navigation.musicLibrary")}
          onPress={() => navigation.navigate("MusicLibraryScreen")}
        />
        <YouRow
          icon={"downloading"}
          label={t("navigation.activeDownloads")}
          onPress={() => navigation.navigate("ActiveDownloadScreen")}
        />
        <YouRow
          icon={"upload"}
          label={t("navigation.activeUploads")}
          onPress={() => navigation.navigate("ActiveUploadScreen")}
        />
      </YouSection>
      <YouSection title={t("you.app")}>
        <YouRow
          icon={"settings"}
          label={t("navigation.settings")}
          onPress={() => navigation.navigate("SettingsScreen")}
        />
      </YouSection>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
  },
  rowLabel: {
    flex: 1,
  },
});
