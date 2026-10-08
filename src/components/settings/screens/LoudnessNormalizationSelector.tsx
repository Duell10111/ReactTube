import {StyleSheet} from "react-native";

import {SettingsSelectorItem} from "../SettingsItem";
import SettingsSection from "../SettingsSection";

import {AppSettings, useAppData} from "@/context/AppDataContext";
import {useTranslation} from "@/localization";
import type {TranslationKey} from "@/localization/en";
import {AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";
import {
  LoudnessNormalizationMode,
  parseLoudnessNormalizationMode,
} from "@/utils/music/LoudnessNormalization";

const loudnessOptions: {
  mode: LoudnessNormalizationMode;
  labelKey: TranslationKey;
}[] = [
  {mode: "off", labelKey: "settings.loudness.off"},
  {mode: "standard", labelKey: "settings.loudness.standard"},
  {mode: "strong", labelKey: "settings.loudness.strong"},
];

export default function LoudnessNormalizationSelectorScreen() {
  const {appSettings, updateSettings} = useAppData();
  const selected = parseLoudnessNormalization(appSettings);
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  return (
    <SettingsSection
      style={[styles.container, {backgroundColor: theme.colors.background}]}
      sectionTitle={t("settings.loudnessNormalization")}>
      {loudnessOptions.map(option => (
        <SettingsSelectorItem
          key={option.mode}
          label={t(option.labelKey)}
          selected={selected === option.mode}
          onPress={() =>
            updateSettings({musicLoudnessNormalization: option.mode})
          }
        />
      ))}
      <AppText color={"textSecondary"} style={{margin: theme.spacing.xl}}>
        {t("settings.loudness.hint")}
      </AppText>
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
  },
});

export function parseLoudnessNormalization(appSettings: AppSettings) {
  return parseLoudnessNormalizationMode(appSettings.musicLoudnessNormalization);
}

export function getLoudnessNormalizationLabel(
  appSettings: AppSettings,
): TranslationKey {
  const mode = parseLoudnessNormalization(appSettings);
  return (
    loudnessOptions.find(option => option.mode === mode)?.labelKey ??
    "settings.loudness.standard"
  );
}
