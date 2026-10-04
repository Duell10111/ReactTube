import {StyleSheet} from "react-native";

import {AppSettings, useAppData} from "../../../context/AppDataContext";
import {SettingsSelectorItem} from "../SettingsItem";
import SettingsSection from "../SettingsSection";

import {useTranslation} from "@/localization";
import {useAppTheme} from "@/ui/theme";

interface PlayerResolution {
  key: string;
  labelKey:
    | "settings.resolution.localHls"
    | "settings.resolution.localHlsAv1"
    | "settings.resolution.youtubeHls"
    | "settings.resolution.progressive"
    | "settings.resolution.sabr";
}

const playerResolutions: {[key: string]: PlayerResolution} = {
  hlsLocal: {
    key: "hlsLocal",
    labelKey: "settings.resolution.localHls",
  },
  hlsLocalAv1: {
    key: "hlsLocalAv1",
    labelKey: "settings.resolution.localHlsAv1",
  },
  hls: {
    key: "hls",
    labelKey: "settings.resolution.youtubeHls",
  },
  http: {
    key: "http",
    labelKey: "settings.resolution.progressive",
  },
  sabr: {
    key: "sabr",
    labelKey: "settings.resolution.sabr",
  },
};

export default function PlayerResolutionSelectorScreen() {
  const {appSettings, updateSettings} = useAppData();
  const player = parsePlayerResolution(appSettings);
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  const onPress = (type: PlayerResolution) => {
    if (type.key === "http") {
      updateSettings({
        hlsEnabled: false,
        localHlsEnabled: false,
        av1Enabled: false,
        sabrEnabled: false,
      });
    } else if (type.key === "hls") {
      updateSettings({
        hlsEnabled: true,
        localHlsEnabled: false,
        av1Enabled: false,
        sabrEnabled: false,
      });
    } else if (type.key === "hlsLocal") {
      updateSettings({
        hlsEnabled: false,
        localHlsEnabled: true,
        av1Enabled: false,
        sabrEnabled: false,
      });
    } else if (type.key === "hlsLocalAv1") {
      updateSettings({
        hlsEnabled: false,
        localHlsEnabled: true,
        av1Enabled: true,
        sabrEnabled: false,
      });
    } else if (type.key === "sabr") {
      // The generated manifest stays configured underneath: SABR needs the local
      // segment server (plan phase 6.5), and until that exists the ladder drops
      // straight through to it. AV1 comes along because SABR has no byte-range
      // cap to work around, so 2160p is the point of choosing it.
      updateSettings({
        hlsEnabled: false,
        localHlsEnabled: true,
        av1Enabled: true,
        sabrEnabled: true,
      });
    }
  };

  return (
    <SettingsSection
      style={[styles.container, {backgroundColor: theme.colors.background}]}
      sectionTitle={t("settings.videoResolution")}>
      {Object.values(playerResolutions).map(v => (
        <SettingsSelectorItem
          key={v.key}
          label={t(v.labelKey)}
          selected={player.key === v.key}
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

export function parsePlayerResolution(appSettings: AppSettings) {
  // The locally generated manifest provides separate multilingual audio tracks
  // and, with AV1, 1440p/2160p. AV1 stays explicit because devices without a
  // hardware decoder can otherwise remain silently stuck while loading.
  // YouTube HLS is the fallback; progressive playback may stop early when the
  // client response is capped (see YouTube.js/docs/byte-range-cap.md).
  if (appSettings.sabrEnabled) {
    return playerResolutions["sabr"];
  }
  if (appSettings.localHlsEnabled) {
    return appSettings.av1Enabled
      ? playerResolutions["hlsLocalAv1"]
      : playerResolutions["hlsLocal"];
  }
  if (appSettings.hlsEnabled === false) {
    return playerResolutions["http"];
  }
  return playerResolutions["hls"];
}

export function getPlayerResolutionLabel(appSettings: AppSettings) {
  return parsePlayerResolution(appSettings).labelKey;
}
