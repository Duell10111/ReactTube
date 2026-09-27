import {useNavigation} from "@react-navigation/native";
import React from "react";
import {StyleSheet, View} from "react-native";

import {useTranslation} from "@/localization";
import type {RootNavProp} from "@/navigation/RootStackNavigator";
import {AppIconButton, AppText} from "@/ui/components";
import {useAppChrome} from "@/ui/layout";
import type {DestinationHeaderAction, SearchRouteName} from "@/ui/navigation";
import {useAppTheme} from "@/ui/theme";

interface AppHeaderProps {
  title: string;
  /** Shows the app name instead of the screen title, used on the start screen. */
  brand?: boolean;
  showSearch?: boolean;
  /**
   * Search surface the search action opens. Music keeps its own screen because
   * its results are filtered by playlists, songs and clips.
   */
  searchRoute?: SearchRouteName;
  /**
   * Shortcut shown in front of the title, for destinations that own a second
   * surface, like the music library.
   */
  leadingAction?: DestinationHeaderAction;
  showAccount?: boolean;
  onBack?: () => void;
  onSearch?: () => void;
  onAccount?: () => void;
}

const BRAND_NAME = "ReactTube";

/**
 * Global header for the phone and tablet shell. Search stays a global action,
 * pointing at the search surface of the active destination, and the account
 * action always leads to the personal surface.
 */
export function AppHeader({
  title,
  brand = false,
  showSearch = true,
  searchRoute = "Search",
  leadingAction,
  showAccount = true,
  onBack,
  onSearch,
  onAccount,
}: AppHeaderProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const {headerHeight, insets} = useAppChrome();
  const navigation = useNavigation<RootNavProp>();

  return (
    <View
      style={{
        backgroundColor: theme.colors.background,
        paddingTop: insets.top,
        paddingStart: insets.left,
        paddingEnd: insets.right,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.divider,
      }}>
      <View
        style={[
          styles.row,
          {
            height: headerHeight,
            paddingHorizontal: theme.spacing.sm,
            gap: theme.spacing.xs,
          },
        ]}>
        {onBack ? (
          <AppIconButton
            accessibilityLabel={t("common.back")}
            icon={"arrow-back"}
            onPress={onBack}
          />
        ) : null}
        {leadingAction ? (
          <AppIconButton
            accessibilityLabel={t(leadingAction.labelKey)}
            icon={leadingAction.icon}
            onPress={() => navigation.navigate(leadingAction.route)}
          />
        ) : null}
        <View style={[styles.titleContainer, {marginStart: theme.spacing.sm}]}>
          <AppText
            numberOfLines={1}
            variant={brand ? "titleMedium" : "titleSmall"}>
            {brand ? BRAND_NAME : title}
          </AppText>
        </View>
        {showSearch ? (
          <AppIconButton
            accessibilityLabel={t("navigation.search")}
            icon={"search"}
            onPress={() =>
              onSearch ? onSearch() : navigation.navigate(searchRoute)
            }
          />
        ) : null}
        {showAccount ? (
          <AppIconButton
            accessibilityLabel={t("navigation.account")}
            icon={"account-circle"}
            onPress={() =>
              onAccount ? onAccount() : navigation.navigate("LoginScreen")
            }
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  titleContainer: {
    flex: 1,
  },
});
