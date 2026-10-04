import {createMMKV} from "react-native-mmkv";
// @ts-ignore Ignore no type definitions found
import {InnerTubeClient} from "youtubei.js/dist/src/types";

import {
  clearInnertubeSessionCache,
  resetStoredVisitorData,
} from "@/utils/InnertubeSession";
import Logger from "@/utils/Logger";
import {Innertube, YT, YTNodes} from "@/utils/Youtube";
import {needsSignedInPlayback} from "@/utils/signedInPlayback";

export {
  PLAYBACK_CLIENTS_DEFAULT,
  PLAYBACK_CLIENTS_FULL_BYTE_RANGE,
  PLAYBACK_CLIENTS_PREFER_HLS,
  PLAYBACK_CLIENTS_SABR,
  PLAYBACK_CLIENTS_SABR_WITH_PO_TOKEN,
  PLAYBACK_CLIENTS_SIGNED_IN,
  sabrPlaybackClients,
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
  /** Forces a `/player` request without OAuth/cookie credentials. */
  skipAuth?: boolean;
  /** Per-client PoToken for the `/player` request (plan phase 5.3). */
  poTokenFor?: (
    client: InnerTubeClient,
  ) => Promise<string | undefined> | string | undefined;
  clientsFallback?: InnerTubeClient[];
  acceptFallback?: ((info: YT.VideoInfo) => boolean) | null;
  /** Requests only `/player`; see `player_only` in the fork. */
  playerOnly?: boolean;
  /** Receives the attempts when no client delivered, to decide what next. */
  onFailure?: (attempts: {status?: string; reason?: string}[]) => void;
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
 * The bot gate ("Sign in to confirm you're not a bot"). Measured on 2026-09-26
 * it is tied to the **IP**, not the session: it hits all clients at once, a
 * freshly fetched `visitorData` does not lift it, and it vanishes as soon as
 * the IP changes (plan §0c).
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

  // A private or age-restricted video rejects every anonymous client; the
  // session is fine.
  if (needsSignedInPlayback(rejected)) {
    LOGGER.info(
      `${profile}: video needs a signed-in account, session identity kept`,
    );
    return;
  }

  resetRejectedPlaybackSession(profile, rejected[0].reason);
}

/**
 * Discards the session identity after a `LOGIN_REQUIRED` — unless the gate is
 * tied to the IP. Then discarding achieves nothing, and a pattern of "new
 * identity per playback attempt" is exactly what bot detection looks for.
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
 * Shared base for video and audio resolution. It keeps client fallback,
 * diagnostics, the successful-client preference and session self-healing in
 * one place; each profile only defines its acceptance criteria.
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
      po_token_for: options.poTokenFor,
      player_only: options.playerOnly,
      accept: options.accept,
      clients_fallback: options.clientsFallback,
      accept_fallback: options.acceptFallback,
      // The `reason` belongs in the log: it tells an IP-wide bot gate apart
      // from a real session or video problem. Without it both look the same
      // (plan §0c).
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
    options.onFailure?.(error?.attempts ?? []);
    LOGGER.warn(
      `${options.profile}: Kein Client lieferte Streams: ${String(
        error?.message ?? error,
      )}`,
    );
    return undefined;
  }
}
