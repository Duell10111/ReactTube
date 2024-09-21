import {StyleSheet} from "react-native";

import {SettingsSelectorItem} from "../SettingsItem";
import SettingsSection from "../SettingsSection";

import {AppSettings, useAppData} from "@/context/AppDataContext";

interface TrackingSelection {
  key: string;
  label: string;
}

const trackingOptions: {[key: string]: TrackingSelection} = {
  enabled: {
    key: "enabled",
    label: "Enabled",
  },
  disabled: {
    key: "disabled",
    label: "Disabled",
  },
};

export default function TrackingSelector() {
  const {appSettings, updateSettings} = useAppData();

  const onPress = (type: TrackingSelection) => {
    if (type.key === "enabled") {
      updateSettings({
        trackingEnabled: true,
      });
    } else if (type.key === "disabled") {
      updateSettings({
        trackingEnabled: false,
      });
    }
  };

  return (
    <SettingsSection style={styles.container} sectionTitle={"Video Tracking"}>
      {Object.values(trackingOptions).map(v => (
        <SettingsSelectorItem
          key={v.key}
          label={v.label}
          selected={parseTrackingSelection(appSettings).key === v.key}
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

export function parseTrackingSelection(appSettings: AppSettings) {
  if (appSettings.trackingEnabled) {
    return trackingOptions["enabled"];
  } else {
    return trackingOptions["disabled"];
  }
}
