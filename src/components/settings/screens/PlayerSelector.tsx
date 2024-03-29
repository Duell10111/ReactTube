import {StyleSheet} from "react-native";

import {AppSettings, useAppData} from "../../../context/AppDataContext";
import {SettingsSelectorItem} from "../SettingsItem";
import SettingsSection from "../SettingsSection";

interface PlayerType {
  key: string;
  label: string;
}

const playerTypes: {[key: string]: PlayerType} = {
  native: {
    key: "native",
    label: "Native",
  },
  vlc: {
    key: "vlc",
    label: "VLC",
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
          onPress={() =>
            updateSettings({vlcEnabled: !(appSettings.vlcEnabled ?? false)})
          }
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
  } else {
    return playerTypes["native"];
  }
}
