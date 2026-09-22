import {StyleSheet} from "react-native";

import {AppSettings, useAppData} from "../../../context/AppDataContext";
import {SettingsSelectorItem} from "../SettingsItem";
import SettingsSection from "../SettingsSection";

import {useTranslation} from "@/localization";
import {useAppTheme} from "@/ui/theme";

interface PlayerType {
  key: string;
  labelKey:
    | "settings.player.native"
    | "settings.player.nativeOverlay"
    | "settings.player.vlc";
}

const playerTypes: {[key: string]: PlayerType} = {
  native: {
    key: "native",
    labelKey: "settings.player.native",
  },
  nativeOverlay: {
    key: "nativeOverlay",
    labelKey: "settings.player.nativeOverlay",
  },
  vlc: {
    key: "vlc",
    labelKey: "settings.player.vlc",
  },
};

export default function PlayerTypeSelectorScreen() {
  const {appSettings, updateSettings} = useAppData();
  const player = parsePlayerType(appSettings);
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  return (
    <SettingsSection
      style={[styles.container, {backgroundColor: theme.colors.background}]}
      sectionTitle={t("settings.playerTypes")}>
      {Object.values(playerTypes).map(v => (
        <SettingsSelectorItem
          key={v.key}
          label={t(v.labelKey)}
          selected={player.key === v.key}
          onPress={() => {
            updateSettings({
              vlcEnabled: !(v.key === "nativeOverlay" || v.key === "native"),
              ownOverlayEnabled: v.key === "nativeOverlay",
            });
          }}
        />
      ))}
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
  },
});

export function parsePlayerType(appSettings: AppSettings) {
  if (appSettings.vlcEnabled) {
    return playerTypes["vlc"];
  } else if (appSettings.ownOverlayEnabled) {
    return playerTypes["nativeOverlay"];
  } else {
    return playerTypes["native"];
  }
}

export function getPlayerTypeLabel(appSettings: AppSettings) {
  return parsePlayerType(appSettings).labelKey;
}
