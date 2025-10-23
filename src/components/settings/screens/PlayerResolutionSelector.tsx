import {StyleSheet} from "react-native";

import {AppSettings, useAppData} from "../../../context/AppDataContext";
import {SettingsSelectorItem} from "../SettingsItem";
import SettingsSection from "../SettingsSection";

interface PlayerResolution {
  key: string;
  label: string;
}

const playerResolutions: {[key: string]: PlayerResolution} = {
  http: {
    key: "http",
    label: "HTTP",
  },
  hls: {
    key: "hls",
    label: "HLS",
  },
  // HLS Local not shown anymore
};

export default function PlayerResolutionSelectorScreen() {
  const {appSettings, updateSettings} = useAppData();
  const player = parsePlayerResolution(appSettings);

  const onPress = (type: PlayerResolution) => {
    if (type.key === "http") {
      updateSettings({
        hlsEnabled: false,
        localHlsEnabled: false,
      });
    } else if (type.key === "hls") {
      updateSettings({
        hlsEnabled: true,
        localHlsEnabled: false,
      });
    } else if (type.key === "hlsLocal") {
      updateSettings({
        hlsEnabled: false,
        localHlsEnabled: true,
      });
    }
  };

  return (
    <SettingsSection
      style={styles.container}
      sectionTitle={"Player Resolution Variant"}>
      {Object.values(playerResolutions).map(v => (
        <SettingsSelectorItem
          key={v.key}
          label={v.label}
          selected={player.key === v.key}
          onPress={() => onPress(v)}
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

export function parsePlayerResolution(appSettings: AppSettings) {
  if (appSettings.hlsEnabled) {
    return playerResolutions["hls"];
  } else if (appSettings.localHlsEnabled) {
    return playerResolutions["hlsLocal"];
  } else {
    return playerResolutions["http"];
  }
}
