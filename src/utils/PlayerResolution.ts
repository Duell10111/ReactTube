import type {AppSettings} from "@/context/AppDataContext";

type PlayerResolutionSettings = Pick<
  AppSettings,
  "hlsEnabled" | "localHlsEnabled" | "av1Enabled" | "sabrEnabled"
>;

export const playerResolutions = {
  hlsLocal: {
    key: "hlsLocal",
    labelKey: "settings.resolution.localHls",
    settings: {
      hlsEnabled: false,
      localHlsEnabled: true,
      av1Enabled: false,
      sabrEnabled: false,
    },
  },
  hlsLocalAv1: {
    key: "hlsLocalAv1",
    labelKey: "settings.resolution.localHlsAv1",
    settings: {
      hlsEnabled: false,
      localHlsEnabled: true,
      av1Enabled: true,
      sabrEnabled: false,
    },
  },
  hls: {
    key: "hls",
    labelKey: "settings.resolution.youtubeHls",
    settings: {
      hlsEnabled: true,
      localHlsEnabled: false,
      av1Enabled: false,
      sabrEnabled: false,
    },
  },
  http: {
    key: "http",
    labelKey: "settings.resolution.progressive",
    settings: {
      hlsEnabled: false,
      localHlsEnabled: false,
      av1Enabled: false,
      sabrEnabled: false,
    },
  },
  sabr: {
    key: "sabr",
    labelKey: "settings.resolution.sabr",
    settings: {
      hlsEnabled: false,
      localHlsEnabled: true,
      av1Enabled: true,
      sabrEnabled: true,
    },
  },
} as const satisfies Record<
  string,
  {key: string; labelKey: string; settings: PlayerResolutionSettings}
>;

export type PlayerResolution =
  (typeof playerResolutions)[keyof typeof playerResolutions];

export function parsePlayerResolution(settings: PlayerResolutionSettings) {
  if (settings.sabrEnabled) {
    return playerResolutions.sabr;
  }
  if (settings.localHlsEnabled) {
    return settings.av1Enabled
      ? playerResolutions.hlsLocalAv1
      : playerResolutions.hlsLocal;
  }
  return settings.hlsEnabled === false
    ? playerResolutions.http
    : playerResolutions.hls;
}

export function getPlayerResolutionLabel(settings: PlayerResolutionSettings) {
  return parsePlayerResolution(settings).labelKey;
}
