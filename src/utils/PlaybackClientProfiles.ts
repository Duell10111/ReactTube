// @ts-ignore youtubei.js does not publish declarations for this internal type.
import type {InnerTubeClient} from "youtubei.js/dist/src/types";

/** Breite, gemessene Fallback-Kette ohne dauerhaft unbrauchbare Clients. */
export const PLAYBACK_CLIENTS_DEFAULT = [
  "TV_SIMPLY",
  "IOS",
  "VISIONOS",
  "ANDROID_VR",
  "TV_DOWNGRADED",
  "MWEB",
] as InnerTubeClient[];

/** Clients mit YouTube-HLS-Manifest zuerst. */
export const PLAYBACK_CLIENTS_PREFER_HLS = [
  "VISIONOS",
  "IOS",
  "TV_SIMPLY",
  "ANDROID_VR",
  "TV_DOWNGRADED",
  "MWEB",
] as InnerTubeClient[];

/** Gemessen ungekappt für Byte-Range-Abrufe direkter Mediendateien. */
export const PLAYBACK_CLIENTS_FULL_BYTE_RANGE = [
  "VISIONOS",
] as InnerTubeClient[];

/**
 * Das Musikprofil ist absichtlich anonym und besitzt eine echte Client-Ladder:
 * VISIONOS liefert direkte Dateien, die übrigen Clients sichern Audio/HLS ab.
 */
export const AUDIO_PLAYBACK_RESOLVER_PROFILE = {
  profile: "audio",
  skipAuth: true,
  clients: PLAYBACK_CLIENTS_FULL_BYTE_RANGE,
  clientsFallback: PLAYBACK_CLIENTS_PREFER_HLS,
};
