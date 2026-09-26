import {StyleSheet} from "react-native";

import {SettingsSelectorItem} from "../SettingsItem";
import SettingsSection from "../SettingsSection";

import {useTranslation, type UILanguage} from "@/localization";
import {useAppTheme} from "@/ui/theme";

const languageOptions: UILanguage[] = ["en", "de"];

export default function UILanguageSelectorScreen() {
  const {language, setLanguage, t} = useTranslation();
  const {theme} = useAppTheme();

  return (
    <SettingsSection
      style={[styles.container, {backgroundColor: theme.colors.background}]}
      sectionTitle={t("settings.languages")}>
      {languageOptions.map(option => (
        <SettingsSelectorItem
          key={option}
          label={t(
            option === "en"
              ? "settings.language.english"
              : "settings.language.german",
          )}
          onPress={() => setLanguage(option)}
          selected={language === option}
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
