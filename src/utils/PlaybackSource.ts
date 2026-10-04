/**
 * Auflösung der Streaming-Daten über eine Client-Kette — Plan-Phase 1.4/1.8.
 *
 * Vorher holte die App ihre Streams von genau einem Client (`TV` für die
 * TV-Oberfläche, `IOS` für HLS). Beides ist brüchig: `TV` liefert seit geraumer
 * Zeit für jedes Video `UNPLAYABLE`, und einzelne Clients fallen ohne Vorwarnung
 * aus. Hier wird stattdessen eine gemessene Reihenfolge durchprobiert, bis ein
 * Client abspielbare Formate liefert — dasselbe Vorgehen wie SmartTubes
 * `VideoInfoService#firstPlayable`.
 *
 * Die Reihenfolge stammt aus `YouTube.js/docs/playback-matrix.md`
 * (`npm run matrix` im Fork erneuert sie).
 */
import Logger from "@/utils/Logger";
import {
  PLAYBACK_CLIENTS_DEFAULT,
  PLAYBACK_CLIENTS_FULL_BYTE_RANGE,
  PLAYBACK_CLIENTS_PREFER_HLS,
  PLAYBACK_CLIENTS_SABR,
  resolvePlaybackInfo,
} from "@/utils/PlaybackResolver";
import {Innertube, YT, YTNodes} from "@/utils/Youtube";

const LOGGER = Logger.extend("PLAYBACK");

/**
 * Welche Auslieferungsform die Wiedergabe anstrebt.
 *
 * - `generated`: eigenes Manifest aus den adaptiven Formaten (Plan-Phase 2c) —
 *   2160p in av01 und getrennte Tonspuren, setzt einen ungekappten Client voraus.
 * - `youtube-hls`: YouTubes eigenes Manifest (Phase 2a) — verlässlich, aber auf
 *   AVPlayer nur avc1 bis 1080p mit gemuxtem Ton.
 * - `progressive`: der alte Weg über eine einzelne Datei-URL. Bricht bei den
 *   gekappten Clients nach wenigen Sekunden ab und bleibt nur zum Vergleichen.
 * - `sabr`: Segmente über `server_abr_streaming_url` (Phase 6). Unabhängig von
 *   der Byte-Range-Gunst einzelner Clients — aber nur `VISIONOS` und `IOS`
 *   werden am SABR-Endpunkt überhaupt bedient (Plan §0c), und die Segmente
 *   brauchen einen lokalen Server, der sie an AVPlayer ausliefert (Phase 6.5).
 *   Solange der fehlt, fällt der Modus auf `generated` zurück.
 */
export type PlaybackMode = "generated" | "youtube-hls" | "progressive" | "sabr";

export interface StreamingSource {
  info: YT.VideoInfo;
  client: string;
  /** `fallback`, wenn kein Client die Hauptbedingung erfüllte. */
  satisfied: "primary" | "fallback";
  /** Ob die Quelle ein HLS-Manifest von YouTube mitbringt. */
  hasHlsManifest: boolean;
  /**
   * Ob sich aus dieser Quelle ein eigenes Manifest bauen lässt: ungekappter
   * Client **und** indizierte mp4-Formate.
   */
  canGenerateHls: boolean;
  /**
   * Ob die Quelle die beiden Eingaben für SABR mitbringt und von einem Client
   * kommt, den der SABR-Endpunkt bedient.
   *
   * Sagt **nichts** darüber, ob SABR abgespielt werden kann: dazu fehlt der
   * lokale Segment-Server aus Phase 6.5.
   */
  canUseSabr: boolean;
}

/**
 * Die beiden Eingaben, ohne die SABR nicht anfangen kann — beide stammen aus
 * derselben `/player`-Antwort. Fehlt sie, fehlen auch sie; das ist der Grund,
 * warum SABR gegen `LOGIN_REQUIRED` nichts ausrichtet (Plan §0c).
 */
function hasSabrInputs(info: YT.VideoInfo): boolean {
  const ustreamer = (info as any).player_config?.media_common_config
    ?.media_ustreamer_request_config?.video_playback_ustreamer_config;

  return !!info.streaming_data?.server_abr_streaming_url && !!ustreamer;
}

/**
 * Indizierte mp4-Formate sind die Voraussetzung für den eigenen Generator:
 * nur mp4 trägt eine `sidx`-Box (VP9 liegt in WebM und indexiert über Cues),
 * und ohne `index_range` gibt es keine Segmentliste.
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
 * Holt die Streaming-Daten über die Client-Kette.
 *
 * @param youtube - **Anonyme** Instanz. Eine angemeldete Session beantwortet
 *   Anfragen für Nicht-TV-Clients mit HTTP 400, weil sie ihre Zugangsdaten
 *   mitschickt.
 * @param target - Video-ID oder Navigations-Endpunkt.
 * @param options.mode - Welche Auslieferungsform angestrebt wird. Die erste
 *   Runde nimmt nur Clients an, die sie bedienen können; erst wenn keiner es
 *   tut, greift die zweite Runde auf irgendetwas Abspielbares zurück.
 */
export async function resolveStreamingSource(
  youtube: Innertube,
  target: string | YTNodes.NavigationEndpoint,
  options?: {mode?: PlaybackMode},
): Promise<StreamingSource | undefined> {
  const mode = options?.mode ?? "generated";

  const resolved = await resolvePlaybackInfo(youtube, target, {
    profile: mode,
    clients:
      mode === "sabr"
        ? PLAYBACK_CLIENTS_SABR
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
    // Scheitert der eigene Generator an der Quelle, ist YouTubes Manifest die
    // nächstbeste Stufe — deshalb steht die ganze HLS-Kette als Reserve bereit.
    // Für SABR gilt dasselbe: liefert kein SABR-Client, bleibt der Phase-2-Weg.
    clientsFallback:
      mode === "generated" || mode === "sabr"
        ? PLAYBACK_CLIENTS_PREFER_HLS
        : undefined,
    // Zweite Runde: irgendein Client mit brauchbaren Formaten.
    acceptFallback: info =>
      info.playability_status?.status === "OK" &&
      !!info.streaming_data &&
      [
        ...(info.streaming_data.formats ?? []),
        ...(info.streaming_data.adaptive_formats ?? []),
      ].some(f => f.has_video && (f.url || f.signature_cipher)),
  });

  if (!resolved) {
    return undefined;
  }

  const hasHlsManifest = !!resolved.info.streaming_data?.hls_manifest_url;
  const canGenerateHls =
    PLAYBACK_CLIENTS_FULL_BYTE_RANGE.some(
      client => client === resolved.client,
    ) && hasIndexedMp4Formats(resolved.info);
  const canUseSabr =
    PLAYBACK_CLIENTS_SABR.some(client => client === resolved.client) &&
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
 * Leitet aus den App-Einstellungen ab, welcher Weg gefahren wird.
 *
 * Alt-Schlüssel (Plan-Phase 2.5): `localHlsEnabled` stand früher für einen
 * lokalen Server, der nie gebaut wurde, und trägt jetzt den eigenen Generator.
 * `hlsEnabled: false` bleibt der Notausgang auf den progressiven Weg.
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
