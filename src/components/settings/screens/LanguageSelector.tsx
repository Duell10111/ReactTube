import {StyleSheet} from "react-native";

import {AppSettings, useAppData} from "../../../context/AppDataContext";
import {SettingsSelectorItem} from "../SettingsItem";
import SettingsSection from "../SettingsSection";

interface Language {
  key: string;
  label: string;
}

const languages: Language[] = [
  {
    key: "en",
    label: "English",
  },
  {
    key: "de",
    label: "Deutsch",
  },
];

export default function LanguageSelectorScreen() {
  const {appSettings, updateSettings} = useAppData();
  const selected = parseLanguage(appSettings);

  return (
    <SettingsSection style={styles.container} sectionTitle={"Languages"}>
      {languages.map(v => (
        <SettingsSelectorItem
          key={v.key}
          label={v.label}
          selected={selected.key === v.key}
          onPress={() =>
            updateSettings({
              languageSelected: v.key,
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

export function parseLanguage(appSettings: AppSettings) {
  return (
    languages.find(v => v.key === appSettings.languageSelected) ?? languages[0]
  );
}
