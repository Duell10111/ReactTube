import {StyleSheet} from "react-native";

import {AppSettings, useAppData} from "../../../context/AppDataContext";
import {SettingsSelectorItem} from "../SettingsItem";
import SettingsSection from "../SettingsSection";

interface PlayerResolution {
  key: string;
  label: string;
}

const playerResolutions: {[key: string]: PlayerResolution} = {
  hlsLocal: {
    key: "hlsLocal",
    label: "Eigenes HLS — bis 1080p, mehrsprachig",
  },
  hlsLocalAv1: {
    key: "hlsLocalAv1",
    label: "Eigenes HLS + AV1 — 4K (nur Apple TV 4K, 3. Gen)",
  },
  hls: {
    key: "hls",
    label: "YouTube-HLS — bis 1080p, Ton gemuxt (Standard)",
  },
  http: {
    key: "http",
    label: "Progressiv (bricht früh ab)",
  },
};

export default function PlayerResolutionSelectorScreen() {
  const {appSettings, updateSettings} = useAppData();
  const player = parsePlayerResolution(appSettings);

  const onPress = (type: PlayerResolution) => {
    if (type.key === "http") {
      updateSettings({
        hlsEnabled: false,
        localHlsEnabled: false,
        av1Enabled: false,
      });
    } else if (type.key === "hls") {
      updateSettings({
        hlsEnabled: true,
        localHlsEnabled: false,
        av1Enabled: false,
      });
    } else if (type.key === "hlsLocal") {
      updateSettings({
        hlsEnabled: false,
        localHlsEnabled: true,
        av1Enabled: false,
      });
    } else if (type.key === "hlsLocalAv1") {
      updateSettings({
        hlsEnabled: false,
        localHlsEnabled: true,
        av1Enabled: true,
      });
    }
  };

  return (
    <SettingsSection
      style={styles.container}
      sectionTitle={"Player Resolution Variant"}>
      {Object.values(playerResolutions).map(v => (
        <SettingsSelectorItem
          key={v.key}
          label={v.label}
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
    backgroundColor: "#111111",
  },
});

export function parsePlayerResolution(appSettings: AppSettings) {
  // Plan-Phase 2c: das selbst gebaute Manifest bringt getrennte, mehrsprachige
  // Tonspuren — mit AV1 zusätzlich 1440p/2160p, die YouTube in avc1 gar nicht
  // anbietet. AV1 ist bewusst eine eigene Auswahl: ohne Hardware-Decoder
  // (alles vor Apple TV 4K, 3. Gen — auch der Simulator) bleibt der Player
  // stumm im Ladezustand hängen, ohne einen Fehler zu melden.
  // YouTubes eigenes Manifest (Phase 2a) bleibt die Reserve, wenn kein
  // ungekappter Client antwortet; der progressive Weg bricht bei gekappten
  // Clients nach rund 0,37 MB ab (siehe YouTube.js/docs/byte-range-cap.md).
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
