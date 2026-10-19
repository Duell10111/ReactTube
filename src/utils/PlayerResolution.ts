import type {AppSettings} from "@/context/AppDataContext";

export type PlayerResolutionType =
  | "auto"
  | "hlsLocal"
  | "hlsLocalAv1"
  | "hls"
  | "http"
  | "sabr";

type PlayerResolutionSettings = Pick<
  AppSettings,
  | "playerResolutionType"
  | "hlsEnabled"
  | "localHlsEnabled"
  | "av1Enabled"
  | "sabrEnabled"
>;

export const playerResolutions = {
  auto: {
    key: "auto",
    labelKey: "settings.resolution.automatic",
    settings: {
      playerResolutionType: "auto",
      hlsEnabled: true,
      localHlsEnabled: false,
      av1Enabled: false,
      sabrEnabled: false,
    },
  },
  hlsLocal: {
    key: "hlsLocal",
    labelKey: "settings.resolution.localHls",
    settings: {
      playerResolutionType: "hlsLocal",
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
      playerResolutionType: "hlsLocalAv1",
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
      playerResolutionType: "hls",
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
      playerResolutionType: "http",
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
      playerResolutionType: "sabr",
      hlsEnabled: false,
      localHlsEnabled: true,
      av1Enabled: true,
      sabrEnabled: true,
    },
  },
} as const satisfies Record<
  PlayerResolutionType,
  {key: string; labelKey: string; settings: PlayerResolutionSettings}
>;

export type PlayerResolution =
  (typeof playerResolutions)[keyof typeof playerResolutions];

export function parsePlayerResolution(settings: PlayerResolutionSettings) {
  if (
    settings.playerResolutionType &&
    Object.prototype.hasOwnProperty.call(
      playerResolutions,
      settings.playerResolutionType,
    )
  ) {
    return playerResolutions[settings.playerResolutionType];
  }
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
