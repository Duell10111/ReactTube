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
 * Clients, die der SABR-Endpunkt tatsächlich bedient.
 *
 * Gemessen am 2026-09-26 gegen `server_abr_streaming_url` (Plan §0c/§6):
 * `VISIONOS` und `IOS` antworten mit HTTP 200 und echten Mediendaten,
 * `TV_SIMPLY` und `WEB` mit **403** — obwohl beide eine `ustreamer_config`
 * mitbringen. Die Liste ist also keine Vorliebe, sondern die Menge des
 * Möglichen.
 *
 * **Die Reihenfolge ist es dagegen schon.** `VISIONOS` meldet durchgehend
 * `STREAM_PROTECTION_STATUS = OK`; `IOS` startet bei `ATTESTATION_PENDING` und
 * verlangt nach einem Seek `ATTESTATION_REQUIRED` — ohne PoToken versiegt der
 * Strom dort also. `IOS` ist Reserve, bis Phase 2b/5 den Token liefert.
 */
export const PLAYBACK_CLIENTS_SABR = ["VISIONOS", "IOS"] as InnerTubeClient[];

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
