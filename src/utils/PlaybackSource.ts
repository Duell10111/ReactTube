/**
 * Resolves streaming data through a client chain — plan phases 1.4/1.8.
 *
 * The app used to fetch its streams from exactly one client (`TV` for the TV
 * UI, `IOS` for HLS). Both are brittle: `TV` has answered `UNPLAYABLE` for
 * every video for a while, and individual clients fail without warning. Here a
 * measured order is tried instead until a client delivers playable formats —
 * the same approach as SmartTube's `VideoInfoService#firstPlayable`.
 *
 * The order comes from `YouTube.js/docs/playback-matrix.md`
 * (`npm run matrix` in the fork refreshes it).
 */
import Logger from "@/utils/Logger";
import {
  PLAYBACK_CLIENTS_DEFAULT,
  PLAYBACK_CLIENTS_FULL_BYTE_RANGE,
  PLAYBACK_CLIENTS_PREFER_HLS,
  PLAYBACK_CLIENTS_SIGNED_IN,
  resolvePlaybackInfo,
  sabrPlaybackClients,
} from "@/utils/PlaybackResolver";
import {Innertube, YT, YTNodes} from "@/utils/Youtube";
import {poTokenForClient, poTokenMinter} from "@/utils/potoken/PoTokenProvider";
import {failedAsPrivateVideo} from "@/utils/privatePlayback";

const LOGGER = Logger.extend("PLAYBACK");

/**
 * Which delivery form playback aims for.
 *
 * - `generated`: the app's own manifest from the adaptive formats (plan phase
 *   2c) — 2160p in av01 and separate audio tracks; needs an uncapped client.
 * - `youtube-hls`: YouTube's own manifest (phase 2a) — reliable, but on
 *   AVPlayer only avc1 up to 1080p with muxed audio.
 * - `progressive`: the old single-file URL path. Breaks off after a few
 *   seconds on capped clients and only remains for comparison.
 * - `sabr`: segments via `server_abr_streaming_url` (phase 6). Independent of
 *   individual clients' byte-range behaviour; the segments are served to
 *   AVPlayer by the local media server (phase 6.5). `WEB` joins the chain
 *   only where a PoToken can be minted (phase 5).
 */
export type PlaybackMode = "generated" | "youtube-hls" | "progressive" | "sabr";

export interface StreamingSource {
  info: YT.VideoInfo;
  client: string;
  /** `fallback` when no client met the primary condition. */
  satisfied: "primary" | "fallback";
  /** Whether the source carries a YouTube HLS manifest. */
  hasHlsManifest: boolean;
  /**
   * Whether the app's own manifest can be built from this source: an uncapped
   * client **and** indexed mp4 formats.
   */
  canGenerateHls: boolean;
  /**
   * Whether the source carries both SABR inputs and comes from a client the
   * SABR endpoint serves. It does not guarantee that the stream starts.
   */
  canUseSabr: boolean;
  /**
   * The streams came through the signed-in session — the user's private
   * video. Only the app's own manifest can play it (no YouTube HLS, no SABR).
   */
  authenticated?: boolean;
}

/**
 * The two inputs SABR cannot start without — both come from the same
 * `/player` response. If that response is missing, so are they; which is why
 * SABR does nothing against `LOGIN_REQUIRED` (plan §0c).
 */
function hasSabrInputs(info: YT.VideoInfo): boolean {
  const ustreamer = (info as any).player_config?.media_common_config
    ?.media_ustreamer_request_config?.video_playback_ustreamer_config;

  return !!info.streaming_data?.server_abr_streaming_url && !!ustreamer;
}

/**
 * Indexed mp4 formats are the prerequisite for the app's own generator: only
 * mp4 carries a `sidx` box (VP9 lives in WebM and indexes via cues), and
 * without `index_range` there is no segment list.
 */
function hasIndexedMp4Formats(info: YT.VideoInfo): boolean {
  const formats = info.streaming_data?.adaptive_formats ?? [];

  const usable = (has_video: boolean) =>
    formats.some(
      f =>
        f.has_video === has_video &&
        f.mime_type.includes("mp4") &&
        !!f.index_range &&
        !!f.init_range &&
        (f.url || f.signature_cipher),
    );

  return usable(true) && usable(false);
}

/**
 * Fetches the streaming data through the client chain.
 *
 * @param youtube - **Anonymous** instance. A signed-in session answers
 *   requests for non-TV clients with HTTP 400 because it sends its
 *   credentials along.
 * @param target - Video id or navigation endpoint.
 * @param options.mode - Which delivery form to aim for. The first pass only
 *   accepts clients that can serve it; only if none does, the second pass
 *   falls back to anything playable.
 * @param options.signedInYoutube - The signed-in TV instance. When the
 *   anonymous chain fails because the video is private, it is asked through
 *   {@link resolveSignedInSource}.
 */
export async function resolveStreamingSource(
  youtube: Innertube,
  target: string | YTNodes.NavigationEndpoint,
  options?: {mode?: PlaybackMode; signedInYoutube?: Innertube},
): Promise<StreamingSource | undefined> {
  const mode = options?.mode ?? "generated";
  const sabrClients = sabrPlaybackClients(poTokenMinter.isSupported);
  const videoId =
    typeof target === "string"
      ? target
      : (target.payload?.videoId as string | undefined);

  let privateVideo = false;

  const resolved = await resolvePlaybackInfo(youtube, target, {
    profile: mode,
    onFailure: attempts => {
      privateVideo = failedAsPrivateVideo(attempts);
    },
    poTokenFor: videoId ? poTokenForClient(videoId) : undefined,
    clients:
      mode === "sabr"
        ? sabrClients
        : mode === "generated"
          ? PLAYBACK_CLIENTS_FULL_BYTE_RANGE
          : mode === "youtube-hls"
            ? PLAYBACK_CLIENTS_PREFER_HLS
            : PLAYBACK_CLIENTS_DEFAULT,
    accept:
      mode === "sabr"
        ? info =>
            info.playability_status?.status === "OK" && hasSabrInputs(info)
        : mode === "generated"
          ? info =>
              info.playability_status?.status === "OK" &&
              hasIndexedMp4Formats(info)
          : mode === "youtube-hls"
            ? info =>
                info.playability_status?.status === "OK" &&
                !!info.streaming_data?.hls_manifest_url
            : info =>
                info.playability_status?.status === "OK" &&
                !!info.streaming_data &&
                [
                  ...(info.streaming_data.formats ?? []),
                  ...(info.streaming_data.adaptive_formats ?? []),
                ].some(
                  format =>
                    format.has_video &&
                    (format.url || format.signature_cipher || format.cipher),
                ),
    // If the app's own generator fails on the source, YouTube's manifest is
    // the next best stage — so the whole HLS chain stands by as a reserve. The
    // same holds for SABR: if no SABR client delivers, the phase 2 path stays.
    clientsFallback:
      mode === "generated" || mode === "sabr"
        ? PLAYBACK_CLIENTS_PREFER_HLS
        : undefined,
    // Second pass: any client with usable formats.
    acceptFallback: info =>
      info.playability_status?.status === "OK" &&
      !!info.streaming_data &&
      [
        ...(info.streaming_data.formats ?? []),
        ...(info.streaming_data.adaptive_formats ?? []),
      ].some(f => f.has_video && (f.url || f.signature_cipher)),
  });

  if (!resolved) {
    return privateVideo && options?.signedInYoutube?.session.logged_in
      ? resolveSignedInSource(options.signedInYoutube, target)
      : undefined;
  }

  const hasHlsManifest = !!resolved.info.streaming_data?.hls_manifest_url;
  const canGenerateHls =
    PLAYBACK_CLIENTS_FULL_BYTE_RANGE.some(
      client => client === resolved.client,
    ) && hasIndexedMp4Formats(resolved.info);
  const canUseSabr =
    sabrClients.some(client => client === resolved.client) &&
    hasSabrInputs(resolved.info);

  const form = canGenerateHls
    ? "eigenes HLS möglich"
    : hasHlsManifest
      ? "YT-HLS"
      : "progressiv (bricht bei gekappten Clients früh ab)";

  LOGGER.info(
    `Streams von ${resolved.client}${resolved.satisfied === "fallback" ? " (Notlösung)" : ""} · ` +
      `${form} · ${resolved.attempts} Versuch(e)`,
  );

  if (mode !== "progressive" && !canGenerateHls && !hasHlsManifest) {
    LOGGER.warn(
      "Weder eigenes noch YouTube-HLS möglich — Wiedergabe wird nach wenigen " +
        "Sekunden abbrechen. Siehe YouTube.js/docs/byte-range-cap.md",
    );
  }

  if (mode === "sabr" && !canUseSabr) {
    LOGGER.info(
      `SABR nicht möglich über ${resolved.client} — es fehlt ` +
        `${
          hasSabrInputs(resolved.info)
            ? "ein Client, den der SABR-Endpunkt bedient"
            : "server_abr_streaming_url oder die ustreamer-Konfiguration"
        }. Es bleibt beim Phase-2-Weg.`,
    );
  }

  return {
    info: resolved.info,
    client: resolved.client,
    satisfied: resolved.satisfied,
    hasHlsManifest,
    canGenerateHls,
    canUseSabr,
  };
}

/**
 * Fetches a private video of the signed-in user through `TV_DOWNGRADED`, the
 * only client that returns it (see `privatePlayback.ts`).
 *
 * The streams carry no YouTube HLS and no SABR URL, but their byte ranges are
 * uncapped, so the app's own manifest plays them in every playback mode.
 */
export async function resolveSignedInSource(
  signedInYoutube: Innertube,
  target: string | YTNodes.NavigationEndpoint,
): Promise<StreamingSource | undefined> {
  const resolved = await resolvePlaybackInfo(signedInYoutube, target, {
    profile: "signed-in",
    clients: PLAYBACK_CLIENTS_SIGNED_IN,
    // Credentials are the point here; `TV_DOWNGRADED` accepts the TV token.
    skipAuth: false,
    // It answers `/next` with HTTP 400 when signed in; the metadata comes from
    // elsewhere (`tv.getInfo` on TV, the player response on phones).
    playerOnly: true,
    accept: info =>
      info.playability_status?.status === "OK" && hasIndexedMp4Formats(info),
    acceptFallback: info =>
      info.playability_status?.status === "OK" &&
      [
        ...(info.streaming_data?.formats ?? []),
        ...(info.streaming_data?.adaptive_formats ?? []),
      ].some(f => f.has_video && (f.url || f.signature_cipher)),
  });

  if (!resolved) {
    LOGGER.warn("Private video: the signed-in session got no streams either");
    return undefined;
  }

  const canGenerateHls = hasIndexedMp4Formats(resolved.info);

  LOGGER.info(
    `Private video via signed-in ${resolved.client} · ` +
      `${canGenerateHls ? "own HLS possible" : "progressive only"}`,
  );

  return {
    info: resolved.info,
    client: resolved.client,
    satisfied: resolved.satisfied,
    hasHlsManifest: !!resolved.info.streaming_data?.hls_manifest_url,
    canGenerateHls,
    canUseSabr: false,
    authenticated: true,
  };
}

/**
 * Derives from the app settings which path is taken.
 *
 * Legacy keys (plan phase 2.5): `localHlsEnabled` used to stand for a local
 * server that was never built and now carries the app's own generator.
 * `hlsEnabled: false` remains the emergency exit to the progressive path.
 */
export function playbackModeFromSettings(settings: {
  hlsEnabled?: boolean;
  localHlsEnabled?: boolean;
  sabrEnabled?: boolean;
}): PlaybackMode {
  if (settings.sabrEnabled) {
    return "sabr";
  }

  if (settings.hlsEnabled === false && !settings.localHlsEnabled) {
    return "progressive";
  }

  return settings.localHlsEnabled ? "generated" : "youtube-hls";
}
