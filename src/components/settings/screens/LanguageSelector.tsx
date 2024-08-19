import {StyleSheet} from "react-native";

import {useAppData} from "../../../context/AppDataContext";
import {languages, parseLanguage} from "../../../utils/YTLanguages";
import {SettingsSelectorItem} from "../SettingsItem";
import SettingsSection from "../SettingsSection";

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
