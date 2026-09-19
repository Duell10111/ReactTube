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

/** Gemessen 6/6 im Testset; `TV` und `TV_EMBEDDED` fehlen bewusst (immer UNPLAYABLE). */
const CLIENTS_DEFAULT = [
  "TV_SIMPLY",
  "IOS",
  "VISIONOS",
  "ANDROID_VR",
  "TV_DOWNGRADED",
  "MWEB",
] as InnerTubeClient[];

/**
 * Clients, die ein HLS-Manifest mitliefern, zuerst.
 *
 * Plan-Phase 2a: YouTubes eigenes HLS ist der verlässliche Weg, kostet aber
 * Qualität — auf AVPlayer höchstens avc1 in 1080p mit gemuxtem Ton. Gemessen
 * liefert `VISIONOS` für alle Testvideos ein Manifest.
 */
const CLIENTS_PREFER_HLS = [
  "VISIONOS",
  "IOS",
  "TV_SIMPLY",
  "ANDROID_VR",
  "TV_DOWNGRADED",
  "MWEB",
] as InnerTubeClient[];

/**
 * Clients, deren Byte-Range-Auslieferung **nicht** gekappt ist.
 *
 * Die Voraussetzung für den eigenen HLS-Generator (Plan-Phase 2c): dessen
 * Playlists adressieren die Segmente über `EXT-X-BYTERANGE` direkt auf der
 * googlevideo-URL. Die meisten Clients beantworten solche Anfragen nur für die
 * ersten rund 0,37 MB und danach mit HTTP 403.
 *
 * Gemessen am 2026-09-19 über zwei Videos, itag 160 und 401, Segmente 0 bis 194:
 * `VISIONOS` liefert durchweg HTTP 206 (nachgemessen: 152 MB 2160p am Stück,
 * fehlerfrei), `IOS`, `TV_SIMPLY` und `ANDROID_VR` kippen ab Segment 13 bzw. 25
 * auf 403. Ein PoToken ändert daran nichts — die Kappung ist eine
 * Client-Eigenschaft, keine Frage der Autorisierung
 * (`YouTube.js/docs/byte-range-cap.md`, `dev-scripts/potoken-probe.mjs`).
 */
const CLIENTS_FULL_BYTE_RANGE = ["VISIONOS"] as InnerTubeClient[];

/**
 * Welche Auslieferungsform die Wiedergabe anstrebt.
 *
 * - `generated`: eigenes Manifest aus den adaptiven Formaten (Plan-Phase 2c) —
 *   2160p in av01 und getrennte Tonspuren, setzt einen ungekappten Client voraus.
 * - `youtube-hls`: YouTubes eigenes Manifest (Phase 2a) — verlässlich, aber auf
 *   AVPlayer nur avc1 bis 1080p mit gemuxtem Ton.
 * - `progressive`: der alte Weg über eine einzelne Datei-URL. Bricht bei den
 *   gekappten Clients nach wenigen Sekunden ab und bleibt nur zum Vergleichen.
 */
export type PlaybackMode = "generated" | "youtube-hls" | "progressive";

const clientStorage = createMMKV({id: "playback-clients"});

/**
 * Merkt sich je Modus den Client, der zuletzt getragen hat — Plan-Phase 4.4,
 * SmartTubes `persistRecentTypeIfNeeded`.
 *
 * Die Kette kostet pro erfolglosem Client eine volle `/player`-Anfrage. Wenn
 * gestern `VISIONOS` lieferte, ist es unnötig, heute wieder bei `TV_SIMPLY`
 * anzufangen. Gespeichert wird nur eine Bevorzugung, keine Festlegung: die
 * übrigen Clients bleiben in der Kette dahinter.
 */
export function rememberSuccessfulClient(mode: PlaybackMode, client: string) {
  clientStorage.set(`recent:${mode}`, client);
}

function preferRecentClient(
  mode: PlaybackMode,
  clients: InnerTubeClient[],
): InnerTubeClient[] {
  const recent = clientStorage.getString(`recent:${mode}`) as
    | InnerTubeClient
    | undefined;

  if (!recent || !clients.includes(recent)) {
    return clients;
  }

  return [recent, ...clients.filter(client => client !== recent)];
}

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

  const clients = preferRecentClient(
    mode,
    mode === "generated"
      ? CLIENTS_FULL_BYTE_RANGE
      : mode === "youtube-hls"
        ? CLIENTS_PREFER_HLS
        : CLIENTS_DEFAULT,
  );

  try {
    const resolved = await youtube.getPlayableInfo(target, {
      clients,
      accept:
        mode === "generated"
          ? info =>
              info.playability_status?.status === "OK" &&
              hasIndexedMp4Formats(info)
          : mode === "youtube-hls"
            ? info =>
                info.playability_status?.status === "OK" &&
                !!info.streaming_data?.hls_manifest_url
            : undefined,
      // Scheitert der eigene Generator an der Quelle, ist YouTubes Manifest die
      // nächstbeste Stufe — deshalb steht die ganze HLS-Kette als Reserve bereit.
      clients_fallback: mode === "generated" ? CLIENTS_PREFER_HLS : undefined,
      // Zweite Runde: irgendein Client mit brauchbaren Formaten.
      accept_fallback: info =>
        info.playability_status?.status === "OK" &&
        !!info.streaming_data &&
        [
          ...(info.streaming_data.formats ?? []),
          ...(info.streaming_data.adaptive_formats ?? []),
        ].some(f => f.has_video && (f.url || f.signature_cipher)),
      on_attempt: attempt =>
        LOGGER.debug(
          `Client ${attempt.client}: ${
            attempt.error ??
            `${attempt.status} · ${attempt.usable_video_formats} nutzbare Videoformate`
          } (${attempt.duration_ms} ms)`,
        ),
    });

    // Selbstheilung: `LOGIN_REQUIRED` von Clients, die sonst funktionieren, ist das
    // Zeichen für ein nicht (mehr) akzeptiertes visitorData. Verwerfen, damit der
    // nächste App-Start sich ein frisches vom Server holt.
    if (
      resolved.attempts.some(attempt => attempt.status === "LOGIN_REQUIRED")
    ) {
      LOGGER.warn(
        "Clients meldeten LOGIN_REQUIRED — Session-Identität wird verworfen, " +
          "der nächste Start holt eine neue.",
      );
      resetStoredVisitorData();
      // Der Session-Cache von youtubei.js hält das visitorData ebenfalls fest und
      // würde es sonst wieder einspielen.
      clearInnertubeSessionCache().catch(() => {});
    }

    const hasHlsManifest = !!resolved.info.streaming_data?.hls_manifest_url;
    const canGenerateHls =
      CLIENTS_FULL_BYTE_RANGE.includes(resolved.client as InnerTubeClient) &&
      hasIndexedMp4Formats(resolved.info);

    const form = canGenerateHls
      ? "eigenes HLS möglich"
      : hasHlsManifest
        ? "YT-HLS"
        : "progressiv (bricht bei gekappten Clients früh ab)";

    LOGGER.info(
      `Streams von ${resolved.client}${resolved.satisfied === "fallback" ? " (Notlösung)" : ""} · ` +
        `${form} · ${resolved.attempts.length} Versuch(e)`,
    );

    if (mode !== "progressive" && !canGenerateHls && !hasHlsManifest) {
      LOGGER.warn(
        "Weder eigenes noch YouTube-HLS möglich — Wiedergabe wird nach wenigen " +
          "Sekunden abbrechen. Siehe YouTube.js/docs/byte-range-cap.md",
      );
    }

    // Nur die erste Runde ist ein echter Treffer; eine Notlösung als Favorit zu
    // merken würde die Kette in die falsche Richtung ziehen.
    if (resolved.satisfied === "primary") {
      rememberSuccessfulClient(mode, resolved.client);
    }

    return {
      info: resolved.info,
      client: resolved.client,
      satisfied: resolved.satisfied,
      hasHlsManifest,
      canGenerateHls,
    };
  } catch (error: any) {
    LOGGER.warn(
      `Kein Client lieferte Streams: ${String(error?.message ?? error)}`,
    );
    return undefined;
  }
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
}): PlaybackMode {
  if (settings.hlsEnabled === false && !settings.localHlsEnabled) {
    return "progressive";
  }

  return settings.localHlsEnabled ? "generated" : "youtube-hls";
}
