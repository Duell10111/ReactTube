import {createMMKV} from "react-native-mmkv";
// @ts-ignore Ignore no type definitions found
import {InnerTubeClient} from "youtubei.js/dist/src/types";

import {
  clearInnertubeSessionCache,
  resetStoredVisitorData,
} from "@/utils/InnertubeSession";
import Logger from "@/utils/Logger";
import {Innertube, YT, YTNodes} from "@/utils/Youtube";

export {
  PLAYBACK_CLIENTS_DEFAULT,
  PLAYBACK_CLIENTS_FULL_BYTE_RANGE,
  PLAYBACK_CLIENTS_PREFER_HLS,
} from "@/utils/PlaybackClientProfiles";

const LOGGER = Logger.extend("PLAYBACK");

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

/**
 * Die Bot-Sperre („Sign in to confirm you're not a bot"). Gemessen am 2026-09-26
 * hängt sie an der **IP**, nicht an der Session: sie trifft alle Clients
 * gleichzeitig, ein frisch geholtes `visitorData` löst sie nicht, und mit dem
 * Wechsel der IP verschwindet sie schlagartig (Plan §0c).
 */
const BOT_GATE_REASON = /confirm you.{0,3}re not a bot/i;

export function isBotGateReason(reason?: string | null): boolean {
  return !!reason && BOT_GATE_REASON.test(reason);
}

function recoverRejectedSession(
  profile: string,
  attempts: {status?: string; reason?: string}[] | undefined,
): void {
  const rejected = attempts?.filter(
    attempt => attempt.status === "LOGIN_REQUIRED",
  );

  if (!rejected?.length) {
    return;
  }

  resetRejectedPlaybackSession(profile, rejected[0].reason);
}

/**
 * Verwirft die Session-Identität nach einem `LOGIN_REQUIRED` — außer die Sperre
 * hängt an der IP. Dann bringt das Verwerfen nichts, und ein Muster aus „neue
 * Identität pro Abspielversuch" ist genau das, wonach die Bot-Erkennung sucht.
 */
export function resetRejectedPlaybackSession(
  profile: string,
  reason?: string,
): void {
  if (isBotGateReason(reason)) {
    LOGGER.warn(
      `${profile}: LOGIN_REQUIRED (${reason}) — die Sperre hängt an der ` +
        "Verbindung, nicht an der Session. Identität bleibt erhalten; hilft " +
        "nur eine andere IP.",
    );
    return;
  }

  LOGGER.warn(
    `${profile}: LOGIN_REQUIRED${reason ? ` (${reason})` : ""} — ` +
      "Session-Identität wird verworfen, der nächste Start holt eine neue.",
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
      // Der `reason` gehört mit ins Log: er unterscheidet eine IP-weite
      // Bot-Sperre von einem echten Session- oder Videoproblem. Ohne ihn sieht
      // beides gleich aus (Plan §0c).
      on_attempt: attempt =>
        LOGGER.debug(
          `${options.profile}: Client ${attempt.client}: ${
            attempt.error ?? attempt.status ?? "unbekannt"
          }${attempt.reason ? ` (${attempt.reason})` : ""} (${
            attempt.duration_ms
          } ms)`,
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
