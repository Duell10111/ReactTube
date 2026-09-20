import {createMMKV} from "react-native-mmkv";
// @ts-ignore Ignore no type definitions found
import {InnerTubeClient} from "youtubei.js/dist/src/types";

import {
  clearInnertubeSessionCache,
  resetStoredVisitorData,
} from "@/utils/InnertubeSession";
import Logger from "@/utils/Logger";
import {Innertube, YT, YTNodes} from "@/utils/Youtube";

const LOGGER = Logger.extend("PLAYBACK");

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

const clientStorage = createMMKV({id: "playback-clients"});

export interface PlaybackInfoResolution {
  info: YT.VideoInfo;
  client: string;
  satisfied: "primary" | "fallback";
  attempts: number;
}

interface PlaybackResolverOptions {
  profile: string;
  clients: InnerTubeClient[];
  accept: (info: YT.VideoInfo) => boolean;
  /** Erzwingt einen `/player`-Abruf ohne OAuth-/Cookie-Zugangsdaten. */
  skipAuth?: boolean;
  clientsFallback?: InnerTubeClient[];
  acceptFallback?: ((info: YT.VideoInfo) => boolean) | null;
}

export function rememberSuccessfulClient(profile: string, client: string) {
  clientStorage.set(`recent:${profile}`, client);
}

function preferRecentClient(
  profile: string,
  clients: InnerTubeClient[],
): InnerTubeClient[] {
  const recent = clientStorage.getString(`recent:${profile}`) as
    | InnerTubeClient
    | undefined;

  if (!recent || !clients.includes(recent)) {
    return clients;
  }

  return [recent, ...clients.filter(client => client !== recent)];
}

function recoverRejectedSession(
  profile: string,
  attempts: {status?: string}[] | undefined,
): void {
  if (!attempts?.some(attempt => attempt.status === "LOGIN_REQUIRED")) {
    return;
  }

  resetRejectedPlaybackSession(profile);
}

export function resetRejectedPlaybackSession(profile: string): void {
  LOGGER.warn(
    `${profile}: LOGIN_REQUIRED — Session-Identität wird verworfen, ` +
      "der nächste Start holt eine neue.",
  );
  resetStoredVisitorData();
  clearInnertubeSessionCache().catch(() => {});
}

/**
 * Gemeinsame Basis für Video- und Audio-Auflösung. Sie hält Client-Fallback,
 * Diagnose, erfolgreiche Client-Präferenz und die Session-Selbstheilung an
 * einer Stelle; das jeweilige Profil definiert nur seine Annahmekriterien.
 */
export async function resolvePlaybackInfo(
  youtube: Innertube,
  target: string | YTNodes.NavigationEndpoint,
  options: PlaybackResolverOptions,
): Promise<PlaybackInfoResolution | undefined> {
  const clients = preferRecentClient(options.profile, options.clients);

  try {
    const resolved = await youtube.getPlayableInfo(target, {
      clients,
      skip_auth: options.skipAuth,
      accept: options.accept,
      clients_fallback: options.clientsFallback,
      accept_fallback: options.acceptFallback,
      on_attempt: attempt =>
        LOGGER.debug(
          `${options.profile}: Client ${attempt.client}: ${
            attempt.error ?? attempt.status ?? "unbekannt"
          } (${attempt.duration_ms} ms)`,
        ),
    });

    recoverRejectedSession(options.profile, resolved.attempts);

    if (resolved.satisfied === "primary") {
      rememberSuccessfulClient(options.profile, resolved.client);
    }

    return {
      info: resolved.info,
      client: resolved.client,
      satisfied: resolved.satisfied,
      attempts: resolved.attempts.length,
    };
  } catch (error: any) {
    recoverRejectedSession(options.profile, error?.attempts);
    LOGGER.warn(
      `${options.profile}: Kein Client lieferte Streams: ${String(
        error?.message ?? error,
      )}`,
    );
    return undefined;
  }
}
