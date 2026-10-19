import {StyleSheet} from "react-native";

import {useAppData} from "../../../context/AppDataContext";
import {SettingsSelectorItem} from "../SettingsItem";
import SettingsSection from "../SettingsSection";

import {useTranslation} from "@/localization";
import {useAppTheme} from "@/ui/theme";
import {
  parsePlayerResolution,
  playerResolutions,
} from "@/utils/PlayerResolution";

export {
  getPlayerResolutionLabel,
  parsePlayerResolution,
} from "@/utils/PlayerResolution";

export default function PlayerResolutionSelectorScreen() {
  const {appSettings, updateSettings} = useAppData();
  const player = parsePlayerResolution(appSettings);
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  return (
    <SettingsSection
      style={[styles.container, {backgroundColor: theme.colors.background}]}
      sectionTitle={t("settings.videoResolution")}>
      {Object.values(playerResolutions).map(v => (
        <SettingsSelectorItem
          key={v.key}
          label={t(v.labelKey)}
          selected={player.key === v.key}
          onPress={() => updateSettings(v.settings)}
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
