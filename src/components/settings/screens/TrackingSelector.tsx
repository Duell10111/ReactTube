import {StyleSheet} from "react-native";

import {SettingsSelectorItem} from "../SettingsItem";
import SettingsSection from "../SettingsSection";

import {AppSettings, useAppData} from "@/context/AppDataContext";
import {useTranslation} from "@/localization";
import {useAppTheme} from "@/ui/theme";

interface TrackingSelection {
  key: string;
  labelKey: "common.enabled" | "common.disabled";
}

const trackingOptions: {[key: string]: TrackingSelection} = {
  enabled: {
    key: "enabled",
    labelKey: "common.enabled",
  },
  disabled: {
    key: "disabled",
    labelKey: "common.disabled",
  },
};

export default function TrackingSelector() {
  const {appSettings, updateSettings} = useAppData();
  const {t} = useTranslation();
  const {theme} = useAppTheme();

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
    <SettingsSection
      style={[styles.container, {backgroundColor: theme.colors.background}]}
      sectionTitle={t("settings.videoTracking")}>
      {Object.values(trackingOptions).map(v => (
        <SettingsSelectorItem
          key={v.key}
          label={t(v.labelKey)}
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
  },
});

export function parseTrackingSelection(appSettings: AppSettings) {
  if (appSettings.trackingEnabled) {
    return trackingOptions["enabled"];
  } else {
    return trackingOptions["disabled"];
  }
}
