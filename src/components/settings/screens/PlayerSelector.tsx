import {StyleSheet} from "react-native";

import {SettingsSelectorItem} from "../SettingsItem";
import SettingsSection from "../SettingsSection";

import {AppSettings, useAppData} from "@/context/AppDataContext";

interface PlayerType {
  key: string;
  label: string;
}

const playerTypes: {[key: string]: PlayerType} = {
  native: {
    key: "native",
    label: "Native",
  },
  nativeOverlay: {
    key: "nativeOverlay",
    label: "Native Overlay",
  },
  vlc: {
    key: "vlc",
    label: "VLC Overlay",
  },
};

export default function PlayerTypeSelectorScreen() {
  const {appSettings, updateSettings} = useAppData();
  const player = parsePlayerType(appSettings);

  return (
    <SettingsSection style={styles.container} sectionTitle={"Player Types"}>
      {Object.values(playerTypes).map(v => (
        <SettingsSelectorItem
          key={v.key}
          label={v.label}
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
    backgroundColor: "#111111",
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
