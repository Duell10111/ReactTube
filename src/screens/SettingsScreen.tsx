import {CompositeScreenProps} from "@react-navigation/native";
import {NativeStackScreenProps} from "@react-navigation/native-stack";
import React, {useCallback} from "react";
import {Platform, StyleSheet, View} from "react-native";

import SettingsItem, {
  SettingsButton,
} from "../components/settings/SettingsItem";
import SettingsSection from "../components/settings/SettingsSection";
import {parsePlayerResolution} from "../components/settings/screens/PlayerResolutionSelector";
import {parsePlayerType} from "../components/settings/screens/PlayerSelector";
import {useAppData} from "../context/AppDataContext";
import {RootStackParamList} from "../navigation/RootStackNavigator";
import {SettingsStackParamList} from "../navigation/SettingsNavigator";
import {parseLanguage} from "../utils/YTLanguages";

import {useAccountContext} from "@/context/AccountContext";
import {useTranslation} from "@/localization";
import {useAppTheme} from "@/ui/theme";

type Props = CompositeScreenProps<
  NativeStackScreenProps<SettingsStackParamList, "Root">,
  NativeStackScreenProps<RootStackParamList, "SettingsScreen">
>;

export default function SettingsScreen({navigation}: Props) {
  const {appSettings} = useAppData();
  const {logout, clearAllData} = useAccountContext();
  const {language, t} = useTranslation();
  const {theme} = useAppTheme();

  const navigate = useCallback<(typeof navigation)["navigate"]>(
    (args: any) => {
      if (Platform.isTV) {
        return navigation.navigate(args);
      } else {
        // @ts-ignore
        return navigation.navigate("SettingsScreen", {screen: args});
      }
    },
    [navigation],
  );

  return (
    <View style={styles.containerStyle}>
      <SettingsSection sectionTitle={t("settings.general")}>
        <SettingsItem
          icon={"globe"}
          iconBackground={theme.colors.brand}
          label={t("settings.uiLanguage")}
          value={t(
            language === "en"
              ? "settings.language.english"
              : "settings.language.german",
          )}
          onPress={() => navigate("UILanguageSelector")}
        />
        <SettingsItem
          icon={"globe"}
          iconBackground={theme.colors.warning}
          label={t("settings.contentLanguage")}
          value={parseLanguage(appSettings).label}
          onPress={() => navigate("LanguageSelector")}
        />
        <SettingsItem
          icon={"globe"}
          iconBackground={theme.colors.brand}
          label={t("settings.videoPlayer")}
          value={parsePlayerType(appSettings).label}
          onPress={() => navigate("PlayerSelector")}
        />
        <SettingsItem
          icon={"globe"}
          iconBackground={theme.colors.warning}
          label={t("settings.videoResolution")}
          value={parsePlayerResolution(appSettings).label}
          onPress={() => navigate("PlayerResolutionSelector")}
        />
        <SettingsItem
          icon={"globe"}
          iconBackground={theme.colors.warning}
          label={t("settings.historyEnabled")}
          value={t(
            appSettings.trackingEnabled
              ? "settings.value.true"
              : "settings.value.false",
          )}
          onPress={() => navigate("TrackingSelector")}
        />
        <SettingsItem
          icon={"activity"}
          iconBackground={theme.colors.success}
          label={t("settings.playbackDiagnostics")}
          value={""}
          onPress={() => navigate("PlaybackDiagnostics")}
        />
        <SettingsButton
          label={t("settings.clearAll")}
          onPress={() => clearAllData()}
        />
        <SettingsButton label={t("settings.logout")} onPress={() => logout()} />
      </SettingsSection>
    </View>
  );
}

const styles = StyleSheet.create({
  containerStyle: {
    flex: 1,
  },
  checkBoxStyle: {
    flex: 1,
  },
});
