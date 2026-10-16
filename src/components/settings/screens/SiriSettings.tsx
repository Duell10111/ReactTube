import {StyleSheet, View} from "react-native";
import {Switch} from "react-native-paper";

import SettingsSection from "../SettingsSection";

import useSiriSettings from "@/hooks/siri/useSiriSettings";
import {useTranslation} from "@/localization";
import {AppListItem, AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

export default function SiriSettings() {
  const {
    playbackEnabled,
    donationsEnabled,
    setPlaybackEnabled,
    setDonationsEnabled,
  } = useSiriSettings();
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  return (
    <SettingsSection
      style={[styles.container, {backgroundColor: theme.colors.background}]}
      sectionTitle={t("settings.siri")}>
      <View style={styles.row}>
        <AppListItem
          onPress={() => setPlaybackEnabled(!playbackEnabled)}
          title={t("settings.siri.playback")}
          trailing={
            <Switch
              onValueChange={setPlaybackEnabled}
              value={playbackEnabled}
            />
          }
        />
        <AppText
          color={"textSecondary"}
          style={styles.hint}
          variant={"bodySmall"}>
          {t("settings.siri.playback.hint")}
        </AppText>
      </View>
      <View style={styles.row}>
        <AppListItem
          onPress={() => setDonationsEnabled(!donationsEnabled)}
          title={t("settings.siri.donations")}
          trailing={
            <Switch
              onValueChange={setDonationsEnabled}
              value={donationsEnabled}
            />
          }
        />
        <AppText
          color={"textSecondary"}
          style={styles.hint}
          variant={"bodySmall"}>
          {t("settings.siri.donations.hint")}
        </AppText>
      </View>
    </SettingsSection>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
  },
  row: {
    marginBottom: 16,
  },
  hint: {
    marginTop: 6,
    paddingHorizontal: 16,
  },
});
