import {StyleSheet} from "react-native";

import {AppSettings, useAppData} from "../../../context/AppDataContext";
import {SettingsSelectorItem} from "../SettingsItem";
import SettingsSection from "../SettingsSection";

interface UiScaleOption {
  key: string;
  label: string;
  value: number;
}

const uiScaleOptions: {[key: string]: UiScaleOption} = {
  small: {key: "small", label: "Small", value: 0.85},
  normal: {key: "normal", label: "Default", value: 1},
  large: {key: "large", label: "Large", value: 1.15},
};

export default function UiScaleSelector() {
  const {appSettings, updateSettings} = useAppData();
  const selected = parseUiScale(appSettings);

  return (
    <SettingsSection style={styles.container} sectionTitle={"UI Scale"}>
      {Object.values(uiScaleOptions).map(v => (
        <SettingsSelectorItem
          key={v.key}
          label={v.label}
          selected={selected.key === v.key}
          onPress={() =>
            updateSettings({
              uiScale: v.value,
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

export function parseUiScale(appSettings: AppSettings) {
  const scale = appSettings.uiScale ?? 1;
  const match = Object.values(uiScaleOptions).find(v => v.value === scale);
  return match ?? uiScaleOptions["normal"];
}
