// @ts-ignore youtubei.js does not publish declarations for this internal type.
import type {InnerTubeClient} from "youtubei.js/dist/src/types";

/** Broad, measured fallback chain without permanently unusable clients. */
export const PLAYBACK_CLIENTS_DEFAULT = [
  "TV_SIMPLY",
  "IOS",
  "VISIONOS",
  "ANDROID_VR",
  "TV_DOWNGRADED",
  "MWEB",
] as InnerTubeClient[];

/** Clients with a YouTube HLS manifest first. */
export const PLAYBACK_CLIENTS_PREFER_HLS = [
  "VISIONOS",
  "IOS",
  "TV_SIMPLY",
  "ANDROID_VR",
  "TV_DOWNGRADED",
  "MWEB",
] as InnerTubeClient[];

/** Measured uncapped for byte-range requests of direct media files. */
export const PLAYBACK_CLIENTS_FULL_BYTE_RANGE = [
  "VISIONOS",
] as InnerTubeClient[];

/**
 * SABR clients for devices without a PoToken runtime.
 *
 * The order matters. `VISIONOS` reports `STREAM_PROTECTION_STATUS = OK`
 * throughout. `IOS` starts at `ATTESTATION_PENDING` and demands
 * `ATTESTATION_REQUIRED` after a seek; a web PoToken does not help it (measured
 * 2026-10-04), so it stays a reserve.
 *
 * Plan §0c measured 403 for `TV_SIMPLY` and `WEB`. Re-measured on 2026-10-04,
 * that came from the unsolved `n` challenge in their streaming URL; deciphered,
 * both are served but stop after a seek without a token, like `IOS`.
 */
export const PLAYBACK_CLIENTS_SABR = ["VISIONOS", "IOS"] as InnerTubeClient[];

/**
 * SABR clients when a PoToken can be minted (plan phase 5).
 *
 * With a content-bound web PoToken, `WEB` reports `OK` and survives seeks
 * (measured 2026-10-04), so it ranks above `IOS`. `VISIONOS` stays first: it
 * needs no token and therefore no BotGuard run.
 */
export const PLAYBACK_CLIENTS_SABR_WITH_PO_TOKEN = [
  "VISIONOS",
  "WEB",
  "IOS",
] as InnerTubeClient[];

export function sabrPlaybackClients(
  poTokenSupported: boolean,
): InnerTubeClient[] {
  return poTokenSupported
    ? PLAYBACK_CLIENTS_SABR_WITH_PO_TOKEN
    : PLAYBACK_CLIENTS_SABR;
}

/**
 * The music profile is deliberately anonymous and has a real client ladder:
 * VISIONOS delivers direct files, the other clients back up audio/HLS.
 */
export const AUDIO_PLAYBACK_RESOLVER_PROFILE = {
  profile: "audio",
  skipAuth: true,
  clients: PLAYBACK_CLIENTS_FULL_BYTE_RANGE,
  clientsFallback: PLAYBACK_CLIENTS_PREFER_HLS,
};
