import {StyleSheet} from "react-native";

import {AppSettings, useAppData} from "../../../context/AppDataContext";
import {SettingsSelectorItem} from "../SettingsItem";
import SettingsSection from "../SettingsSection";

interface PlaybackSpeed {
  key: string;
  label: string;
  value: number;
}

const speeds: {[key: string]: PlaybackSpeed} = {
  "0.5": {key: "0.5", label: "0.5x", value: 0.5},
  "1": {key: "1", label: "1x", value: 1},
  "1.5": {key: "1.5", label: "1.5x", value: 1.5},
  "2": {key: "2", label: "2x", value: 2},
};

export default function PlaybackSpeedSelector() {
  const {appSettings, updateSettings} = useAppData();
  const selected = parsePlaybackSpeed(appSettings);

  return (
    <SettingsSection style={styles.container} sectionTitle={"Playback Speed"}>
      {Object.values(speeds).map(v => (
        <SettingsSelectorItem
          key={v.key}
          label={v.label}
          selected={selected.key === v.key}
          onPress={() =>
            updateSettings({
              playbackRate: v.value,
            })
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

export function parsePlaybackSpeed(appSettings: AppSettings) {
  const rate = appSettings.playbackRate ?? 1;
  const match = Object.values(speeds).find(v => v.value === rate);
  return match ?? speeds["1"];
}
