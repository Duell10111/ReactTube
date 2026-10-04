/**
 * Wiedergabe-Diagnose — Plan-Phase 0.1
 *
 * Beantwortet auf dem echten Gerät die Fragen, die der Node-Lauf
 * (YouTube.js/dev-scripts/playback-matrix.mjs) nicht beantworten kann:
 *
 *  1. Kann die JS-Engine den Player-Code ausführen? Hermes unterstützt
 *     `eval`/`new Function` aus Strings nicht zwingend — genau darauf baut aber
 *     der Decipher-Pfad in src/ytjs/react-native.ts auf.
 *  2. Wurde überhaupt ein Player geladen?
 *  3. Welche InnerTube-Clients liefern auf diesem Gerät abrufbare Formate?
 *
 * Bewusst ohne UI-Abhängigkeiten, damit die Prüfungen auch aus einem Test oder
 * einem Skript heraus laufen können.
 */
// @ts-ignore Ignore no type definitions found
import {InnerTubeClient} from "youtubei.js/dist/src/types";

import {Innertube, Misc, Sabr} from "@/utils/Youtube";

export interface EngineCheck {
  hermes: boolean;
  hermesRelease?: string;
  newFunction: "ok" | string;
  evalCall: "ok" | string;
}

export interface FormatCheck {
  itag?: number;
  codec?: string | null;
  quality?: string | null;
  needsDecipher?: boolean;
  decipher?: "ok" | string;
  httpStatus?: number;
  sidxSegments?: number;
  sidx?: "ok" | string;
  missing?: string;
}

export interface ClientCheck {
  client: string;
  playability?: string;
  reason?: string | null;
  videoFormats?: number;
  audioFormats?: number;
  maxHeight?: number;
  plainUrls?: number;
  cipherUrls?: number;
  sabrOnly?: number;
  hasHlsManifest?: boolean;
  hasSabrUrl?: boolean;
  video?: FormatCheck;
  audio?: FormatCheck;
  error?: string;
  ms?: number;
}

export interface TvNamespaceCheck {
  playability?: string;
  reason?: string | null;
  videoFormats?: number;
  maxHeight?: number;
  plainUrls?: number;
  /** Felder aus der /next-Antwort, die die TV-Oberfläche der App benötigt. */
  nextFields?: string[];
  error?: string;
}

/**
 * Ergebnis der SABR-Probe — Plan-Phase 6.
 *
 * Beantwortet die Frage, die der Node-Lauf nicht beantworten kann: setzt `fetch`
 * unter Hermes einen POST mit Protobuf-Rumpf so ab, dass der SABR-Endpunkt ihn
 * annimmt, und lässt sich die UMP-Antwort auf dem Gerät zerlegen? `streamedBody`
 * ist dabei der interessante Nebenbefund — React Native liefert in der Regel
 * keinen lesbaren `response.body`, die Antwort landet also komplett im Speicher.
 */
export interface SabrCheck {
  client: string;
  hasSabrUrl: boolean;
  hasUstreamerConfig: boolean;
  videoItag?: number;
  audioItag?: number;
  /** Ob die Antwort strömend gelesen wurde oder ganz gepuffert werden musste. */
  streamedBody?: boolean;
  /** `STREAM_PROTECTION_STATUS` der Antwort. `required` heißt: PoToken nötig. */
  protectionStatus?: string;
  formats?: {
    key: string;
    mimeType?: string;
    totalSegments: number;
    durationMs: number;
    /** Größe des Init-Segments und seine mp4-Boxen (`ftyp moov …` erwartet). */
    initBytes?: number;
    initBoxes?: string;
    /** Erstes Mediensegment (`moof mdat` erwartet). */
    segmentBytes?: number;
    segmentBoxes?: string;
  }[];
  /** UMP-Parts, die die Implementierung nicht kennt — Hinweis auf Protokolldrift. */
  unknownParts?: string[];
  error?: string;
  ms?: number;
}

export interface DiagnosticsResult {
  startedAt: string;
  videoId: string;
  /**
   * Welche Innertube-Instanz geprüft wurde. Wichtig: der Login der App hängt an
   * der TV-Instanz (useAccountData.ts nutzt useYoutubeTVContext), die
   * Standard-Instanz bleibt anonym — ein TV-Ergebnis aus der falschen Instanz
   * beantwortet die Auth-Frage nicht.
   */
  session: {
    label: string;
    loggedIn: boolean;
  };
  engine: EngineCheck;
  player: {
    available: boolean;
    signatureTimestamp?: number;
    error?: string;
  };
  clients: ClientCheck[];
  /** Der Pfad, den die App für die TV-Wiedergabe tatsächlich benutzt. */
  tvNamespace?: TvNamespaceCheck;
  /** Holt SABR auf diesem Gerät echte Segmente? */
  sabr?: SabrCheck;
}

export const DIAGNOSTICS_CLIENTS: InnerTubeClient[] = [
  "TV",
  "TV_SIMPLY",
  "IOS",
  "VISIONOS",
  "ANDROID_VR",
  "WEB",
  "MWEB",
] as InnerTubeClient[];

export const DIAGNOSTICS_DEFAULT_VIDEO = "bUHZ2k9DYHY";

/* ------------------------------------ Engine ---------------------------------- */

export function checkEngine(): EngineCheck {
  const hermesInternal = (globalThis as any).HermesInternal;

  const result: EngineCheck = {
    hermes: !!hermesInternal,
    hermesRelease:
      hermesInternal?.getRuntimeProperties?.()?.["OSS Release Version"],
    newFunction: "ok",
    evalCall: "ok",
  };

  try {
    // Exakt der Mechanismus, den der Shim in src/ytjs/react-native.ts nutzt —
    // hier bewusst aufgerufen, um genau das zu prüfen.
    // eslint-disable-next-line no-new-func
    const fn = new Function("return 1 + 1");
    if (fn() !== 2) {
      result.newFunction = "liefert falsches Ergebnis";
    }
  } catch (error: any) {
    result.newFunction = String(error?.message ?? error);
  }

  try {
    // eslint-disable-next-line no-eval
    if (eval("1 + 1") !== 2) {
      result.evalCall = "liefert falsches Ergebnis";
    }
  } catch (error: any) {
    result.evalCall = String(error?.message ?? error);
  }

  return result;
}

/* ------------------------------------- sidx ----------------------------------- */

/**
 * Liest die Anzahl der Subsegmente aus einer sidx-Box.
 * Kurzfassung des Parsers, den Plan-Phase 2.1 als src/utils/Mp4SidxParser.ts
 * in den Fork bringt — hier nur, um die Machbarkeit auf dem Gerät zu zeigen.
 */
export function readSidxSegmentCount(bytes: Uint8Array): number {
  const u32 = (o: number) =>
    bytes[o] * 2 ** 24 +
    (bytes[o + 1] << 16) +
    (bytes[o + 2] << 8) +
    bytes[o + 3];

  let offset = 0;
  while (offset + 8 <= bytes.length) {
    let size = u32(offset);
    const type = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7],
    );
    let header = 8;

    if (size === 1) {
      size = u32(offset + 8) * 2 ** 32 + u32(offset + 12);
      header = 16;
    } else if (size === 0) {
      size = bytes.length - offset;
    }

    if (type === "sidx") {
      let p = offset + header;
      const version = bytes[p];
      p += 4 + 4 + 4; // version/flags + reference_ID + timescale
      p += version === 0 ? 8 : 16; // earliest_presentation_time + first_offset
      p += 2; // reserved
      return (bytes[p] << 8) | bytes[p + 1];
    }

    if (size <= 0) {
      break;
    }
    offset += size;
  }

  throw new Error("keine sidx-Box gefunden");
}

/* ------------------------------------ Formate --------------------------------- */

function pickCandidates(info: any) {
  const adaptive = info.streaming_data?.adaptive_formats ?? [];
  const usable = (f: Misc.Format) =>
    f.mime_type?.includes("mp4") && f.init_range && f.index_range;

  return {
    video: adaptive
      .filter((f: Misc.Format) => f.has_video && !f.has_audio && usable(f))
      .sort(
        (a: Misc.Format, b: Misc.Format) => (b.height ?? 0) - (a.height ?? 0),
      )[0],
    audio: adaptive
      .filter((f: Misc.Format) => f.has_audio && !f.has_video && usable(f))
      .sort(
        (a: Misc.Format, b: Misc.Format) => (b.bitrate ?? 0) - (a.bitrate ?? 0),
      )[0],
  };
}

async function checkFormat(
  format: Misc.Format | undefined,
  player: any,
  kind: string,
): Promise<FormatCheck> {
  if (!format) {
    return {missing: `kein mp4-${kind} mit init+index`};
  }

  const check: FormatCheck = {
    itag: format.itag,
    codec: format.mime_type?.match(/codecs="([^"]+)/)?.[1] ?? null,
    quality: format.quality_label ?? format.audio_quality ?? null,
    needsDecipher: !format.url,
  };

  let url: string;
  try {
    url = await format.decipher(player);
    check.decipher = "ok";
  } catch (error: any) {
    check.decipher = String(error?.message ?? error);
    return check;
  }

  try {
    const response = await fetch(url, {headers: {Range: "bytes=0-1"}});
    check.httpStatus = response.status;
  } catch (error: any) {
    check.decipher = `HTTP: ${String(error?.message ?? error)}`;
    return check;
  }

  if (format.index_range) {
    try {
      const response = await fetch(url, {
        headers: {
          Range: `bytes=${format.index_range.start}-${format.index_range.end}`,
        },
      });
      const bytes = new Uint8Array(await response.arrayBuffer());
      check.sidxSegments = readSidxSegmentCount(bytes);
      check.sidx = "ok";
    } catch (error: any) {
      check.sidx = String(error?.message ?? error);
    }
  }

  return check;
}

/* ------------------------------------- SABR ----------------------------------- */

/**
 * Liest die Top-Level-Boxtypen eines mp4-Fragments.
 *
 * Reicht als Echtheitsprüfung: ein Init-Segment beginnt mit `ftyp` und trägt
 * `moov`, ein Mediensegment `moof` + `mdat`. Was dazwischen an Bytes liegt, muss
 * hier niemand deuten.
 */
function readBoxTypes(data: Uint8Array, limit = 6): string {
  const types: string[] = [];
  let offset = 0;

  while (offset + 8 <= data.length && types.length < limit) {
    const size =
      data[offset] * 2 ** 24 +
      (data[offset + 1] << 16) +
      (data[offset + 2] << 8) +
      data[offset + 3];

    types.push(
      String.fromCharCode(
        data[offset + 4],
        data[offset + 5],
        data[offset + 6],
        data[offset + 7],
      ),
    );

    // 0 heißt „bis zum Ende", 1 heißt 64-Bit-Größe dahinter — beides beendet
    // hier die Aufzählung, weil der erste Boxtyp die Frage schon beantwortet.
    if (size < 8) {
      break;
    }

    offset += size;
  }

  return types.join(" ");
}

/**
 * Wählt bewusst die **kleinsten** indizierten mp4-Formate.
 *
 * Die Probe prüft den Mechanismus, nicht die Qualität — und eine Runde 2160p
 * kostet rund 2,5 MB Mobilfunk- oder WLAN-Verkehr für nichts.
 */
function pickSmallestSabrFormats(info: any) {
  const adaptive = info.streaming_data?.adaptive_formats ?? [];
  const usable = (f: any) => f.mime_type?.includes("mp4");

  const video = adaptive
    .filter((f: any) => f.has_video && !f.has_audio && usable(f))
    .sort((a: any, b: any) => (a.height ?? 0) - (b.height ?? 0))[0];

  const audio = adaptive
    .filter((f: any) => f.has_audio && !f.has_video && usable(f))
    .sort((a: any, b: any) => (a.bitrate ?? 0) - (b.bitrate ?? 0))[0];

  return {video, audio};
}

/**
 * Zieht über SABR ein Init- und ein Mediensegment je Spur.
 *
 * Gemessen (Plan §6) bedient der SABR-Endpunkt nur `VISIONOS` und `IOS`; bei
 * `IOS` verlangt der Server nach kurzer Zeit Attestierung. Deshalb ist
 * `VISIONOS` die Vorgabe.
 */
export async function checkSabr(
  youtube: Innertube,
  videoId: string,
  client = "VISIONOS",
): Promise<SabrCheck> {
  const started = Date.now();
  const check: SabrCheck = {
    client,
    hasSabrUrl: false,
    hasUstreamerConfig: false,
  };

  try {
    const info = await youtube.getBasicInfo(videoId, {client} as any);
    const streamingUrl = info.streaming_data?.server_abr_streaming_url;
    const ustreamerConfig = (info as any).player_config?.media_common_config
      ?.media_ustreamer_request_config?.video_playback_ustreamer_config;

    check.hasSabrUrl = !!streamingUrl;
    check.hasUstreamerConfig = !!ustreamerConfig;

    if (!streamingUrl || !ustreamerConfig) {
      check.error =
        "Die /player-Antwort trägt keine SABR-Eingaben — ohne sie ist SABR " +
        "unmöglich (siehe Plan §0c).";
      return check;
    }

    const {video, audio} = pickSmallestSabrFormats(info);

    if (!video || !audio) {
      check.error = "Keine indizierten mp4-Formate für Video und Ton gefunden";
      return check;
    }

    check.videoItag = video.itag;
    check.audioItag = audio.itag;

    const toFormatId = (format: any) => ({
      itag: format.itag,
      lastModified: Number(format.last_modified_ms ?? 0),
      xtags: format.xtags ?? undefined,
    });

    const stream = new Sabr.SabrStream({
      server_abr_streaming_url: streamingUrl,
      ustreamer_config: ustreamerConfig,
      client_name: client,
      client_version: youtube.session.context.client.clientVersion,
      video_format_id: toFormatId(video),
      audio_format_id: toFormatId(audio),
      video_id: videoId,
      // Dieselbe fetch-Funktion wie der Rest der Session, damit Kopfzeilen und
      // Netzwerkverhalten sich nicht von den übrigen Abrufen unterscheiden.
      fetch: youtube.session.http.fetch_function,
    });

    const source = new Sabr.SabrSegmentSource(stream, {window: 4});

    try {
      const formats = await source.open();

      check.formats = [];

      for (const format of formats) {
        const entry: NonNullable<SabrCheck["formats"]>[number] = {
          key: format.key,
          mimeType: format.mime_type,
          totalSegments: format.total_segments,
          durationMs: format.duration_ms,
        };

        const init = await source.getInit(format.key);
        entry.initBytes = init.length;
        entry.initBoxes = readBoxTypes(init);

        const segment = await source.getSegment(format.key, 1);
        entry.segmentBytes = segment.length;
        entry.segmentBoxes = readBoxTypes(segment);

        check.formats.push(entry);
      }

      check.streamedBody = stream.last_response_streamed;
      check.protectionStatus = stream.protection_status;
      check.unknownParts = stream.unknown_parts;
    } finally {
      await source.close();
    }
  } catch (error: any) {
    check.error = String(error?.message ?? error);
  }

  check.ms = Date.now() - started;
  return check;
}

/* ------------------------------------- Lauf ----------------------------------- */

export async function runDiagnostics(
  youtube: Innertube,
  options?: {
    videoId?: string;
    clients?: InnerTubeClient[];
    label?: string;
    includeTvNamespace?: boolean;
    /**
     * Zieht zusätzlich echte Segmente über SABR (Plan-Phase 6).
     *
     * Gemessen kostet die Probe einen zusätzlichen `/player`-Abruf und **eine**
     * SABR-Anfrage mit rund 110 KB über die Leitung (80 KB davon Segmentdaten) —
     * sie wählt dafür die kleinsten mp4-Formate. Sie gehört an die **anonyme**
     * Instanz: eine angemeldete Session beantwortet Nicht-TV-Clients mit HTTP 400,
     * und SABR braucht genau einen davon.
     */
    includeSabr?: boolean;
  },
): Promise<DiagnosticsResult> {
  const videoId = options?.videoId ?? DIAGNOSTICS_DEFAULT_VIDEO;
  const clients = options?.clients ?? DIAGNOSTICS_CLIENTS;

  const player = youtube.session.player;

  const result: DiagnosticsResult = {
    startedAt: new Date().toISOString(),
    videoId,
    session: {
      label: options?.label ?? "Session",
      loggedIn: !!youtube.session.logged_in,
    },
    engine: checkEngine(),
    player: {
      available: !!player,
      signatureTimestamp: player?.signature_timestamp,
      error: player ? undefined : "Kein Player in der Session geladen",
    },
    clients: [],
  };

  for (const client of clients) {
    const started = Date.now();
    const entry: ClientCheck = {client};

    try {
      const info = await youtube.getBasicInfo(videoId, {client});
      const streaming = info.streaming_data;
      const all = [
        ...(streaming?.formats ?? []),
        ...(streaming?.adaptive_formats ?? []),
      ];

      entry.playability = info.playability_status?.status;
      entry.reason = info.playability_status?.reason || null;
      entry.videoFormats = all.filter(f => f.has_video).length;
      entry.audioFormats = all.filter(f => f.has_audio && !f.has_video).length;
      entry.maxHeight = all.reduce((n, f) => Math.max(n, f.height ?? 0), 0);
      entry.plainUrls = all.filter(f => !!f.url).length;
      entry.cipherUrls = all.filter(f => !f.url && !!f.signature_cipher).length;
      entry.sabrOnly = all.filter(f => !f.url && !f.signature_cipher).length;
      entry.hasHlsManifest = !!streaming?.hls_manifest_url;
      entry.hasSabrUrl = !!streaming?.server_abr_streaming_url;

      if (streaming) {
        const candidates = pickCandidates(info);
        entry.video = await checkFormat(
          candidates.video,
          player,
          "Videoformat",
        );
        entry.audio = await checkFormat(
          candidates.audio,
          player,
          "Audioformat",
        );
      }
    } catch (error: any) {
      entry.error = String(error?.message ?? error);
    }

    entry.ms = Date.now() - started;
    result.clients.push(entry);
  }

  if (options?.includeTvNamespace) {
    result.tvNamespace = await checkTvNamespace(youtube, videoId);
  }

  if (options?.includeSabr) {
    result.sabr = await checkSabr(youtube, videoId);
  }

  return result;
}

/**
 * Prüft `tv.getInfo()` — den Pfad, über den die App ihre TV-Wiedergabe holt.
 * `/player` und `/next` sind getrennte Anfragen: der TV-Client kann bei den
 * Metadaten vollständig sein und beim Player trotzdem UNPLAYABLE liefern.
 */
async function checkTvNamespace(
  youtube: Innertube,
  videoId: string,
): Promise<TvNamespaceCheck> {
  try {
    const info = await youtube.tv.getInfo(videoId);
    const streaming = info.streaming_data;
    const all = [
      ...(streaming?.formats ?? []),
      ...(streaming?.adaptive_formats ?? []),
    ];

    return {
      playability: info.playability_status?.status,
      reason: info.playability_status?.reason || null,
      videoFormats: all.filter(f => f.has_video).length,
      maxHeight: all.reduce((n, f) => Math.max(n, f.height ?? 0), 0),
      plainUrls: all.filter(f => !!f.url).length,
      nextFields: [
        info.primary_info && "primary_info",
        info.secondary_info && "secondary_info",
        info.watch_next_feed && `watch_next(${info.watch_next_feed.length})`,
        info.transport_controls && "transport_controls",
        info.player_overlays && "player_overlays",
        info.autoplay && "autoplay",
      ].filter(Boolean) as string[],
    };
  } catch (error: any) {
    return {error: String(error?.message ?? error)};
  }
}

/** Kompakte Textfassung — für Logs und zum Kopieren in die Zwischenablage. */
export function formatDiagnostics(result: DiagnosticsResult): string {
  const lines: string[] = [];

  lines.push(`Wiedergabe-Diagnose ${result.startedAt}`);
  lines.push(`Video: ${result.videoId}`);
  lines.push(
    `Session: ${result.session.label} · ${result.session.loggedIn ? "ANGEMELDET" : "anonym"}`,
  );
  lines.push("");
  lines.push(
    `Engine: ${result.engine.hermes ? `Hermes ${result.engine.hermesRelease ?? ""}`.trim() : "JSC/andere"}`,
  );
  lines.push(`  new Function: ${result.engine.newFunction}`);
  lines.push(`  eval:         ${result.engine.evalCall}`);
  lines.push(
    `Player: ${result.player.available ? `geladen (sts ${result.player.signatureTimestamp})` : result.player.error}`,
  );
  lines.push("");

  for (const c of result.clients) {
    if (c.error) {
      lines.push(`${c.client}: FEHLER ${c.error}`);
      continue;
    }

    lines.push(
      `${c.client}: ${c.playability}${c.reason ? ` (${c.reason})` : ""} · ` +
        `${c.videoFormats}V/${c.audioFormats}A · max ${c.maxHeight}p · ` +
        `URL ${c.plainUrls}/Cipher ${c.cipherUrls}/SABR-only ${c.sabrOnly}` +
        `${c.hasHlsManifest ? " · YT-HLS" : ""}${c.hasSabrUrl ? " · SABR-URL" : ""} · ${c.ms}ms`,
    );

    for (const [kind, f] of [
      ["Video", c.video],
      ["Audio", c.audio],
    ] as const) {
      if (!f) continue;
      if (f.missing) {
        lines.push(`    ${kind}: ${f.missing}`);
      } else {
        lines.push(
          `    ${kind}: itag ${f.itag} ${f.codec ?? ""} ${f.quality ?? ""} · ` +
            `decipher ${f.decipher} · HTTP ${f.httpStatus ?? "–"} · ` +
            `sidx ${f.sidx === "ok" ? `${f.sidxSegments} Segmente` : (f.sidx ?? "–")}`,
        );
      }
    }
  }

  if (result.sabr) {
    const sabr = result.sabr;
    lines.push("");
    lines.push(`SABR (${sabr.client}):`);

    if (!sabr.hasSabrUrl || !sabr.hasUstreamerConfig) {
      lines.push(
        `    Eingaben fehlen — SABR-URL ${sabr.hasSabrUrl ? "ja" : "nein"}, ` +
          `ustreamer-Konfiguration ${sabr.hasUstreamerConfig ? "ja" : "nein"}`,
      );
    }

    if (sabr.error) {
      lines.push(`    FEHLER ${sabr.error}`);
    } else {
      lines.push(
        `    itag ${sabr.videoItag}+${sabr.audioItag} · ` +
          `Antwort ${sabr.streamedBody ? "strömend" : "ganz gepuffert"} · ` +
          `Schutz ${sabr.protectionStatus} · ${sabr.ms}ms`,
      );

      for (const format of sabr.formats ?? []) {
        lines.push(
          `    ${format.key} ${format.mimeType ?? ""} · ` +
            `${format.totalSegments} Segmente · ${format.durationMs}ms`,
        );
        lines.push(
          `        init ${format.initBytes}B [${format.initBoxes}] · ` +
            `Segment 1 ${format.segmentBytes}B [${format.segmentBoxes}]`,
        );
      }

      if (sabr.unknownParts?.length) {
        lines.push(`    unbekannte UMP-Parts: ${sabr.unknownParts.join(", ")}`);
      }
    }
  }

  if (result.tvNamespace) {
    const tv = result.tvNamespace;
    lines.push("");
    if (tv.error) {
      lines.push(`tv.getInfo (App-Pfad): FEHLER ${tv.error}`);
    } else {
      lines.push(
        `tv.getInfo (App-Pfad): ${tv.playability}${tv.reason ? ` (${tv.reason})` : ""} · ` +
          `${tv.videoFormats}V · max ${tv.maxHeight}p · URL ${tv.plainUrls}`,
      );
      lines.push(`    /next: ${tv.nextFields?.join(", ") || "nichts"}`);
    }
  }

  return lines.join("\n");
}

/* ---------------------------- Laufzeit-Protokollierung ------------------------ */

/**
 * Kompakte Beschreibung der Streaming-Daten einer Player-Antwort — Plan-Phase 0.4.
 * Wird bei jedem Videoabruf protokolliert, damit im Fehlerfall nachvollziehbar
 * ist, welcher Client welche Formate geliefert hat.
 */
export function describeStreamingData(info: any, label: string): string {
  const streaming = info?.streaming_data;

  if (!streaming) {
    return (
      `${label}: keine streaming_data · ` +
      `playability=${info?.playability_status?.status ?? "?"}` +
      `${info?.playability_status?.reason ? ` (${info.playability_status.reason})` : ""}`
    );
  }

  const all = [
    ...(streaming.formats ?? []),
    ...(streaming.adaptive_formats ?? []),
  ];
  const maxHeight = all.reduce(
    (n: number, f: any) => Math.max(n, f.height ?? 0),
    0,
  );

  return (
    `${label}: playability=${info?.playability_status?.status ?? "?"} · ` +
    `muxed=${streaming.formats?.length ?? 0} adaptive=${streaming.adaptive_formats?.length ?? 0} · ` +
    `max=${maxHeight}p · ` +
    `url=${all.filter((f: any) => !!f.url).length} ` +
    `cipher=${all.filter((f: any) => !f.url && !!f.signature_cipher).length} ` +
    `sabrOnly=${all.filter((f: any) => !f.url && !f.signature_cipher).length}` +
    `${streaming.hls_manifest_url ? " · YT-HLS" : ""}` +
    `${streaming.server_abr_streaming_url ? " · SABR-URL" : ""}` +
    `${streaming.expires ? ` · expires=${new Date(streaming.expires).toISOString()}` : ""}`
  );
}
