/**
 * Playback diagnostics — plan phase 0.1
 *
 * Answers on the real device the questions the Node run
 * (YouTube.js/dev-scripts/playback-matrix.mjs) cannot answer:
 *
 *  1. Can the JS engine execute the player code? Hermes does not necessarily
 *     support `eval`/`new Function` from strings — yet the decipher path in
 *     src/ytjs/react-native.ts builds on exactly that.
 *  2. Was a player loaded at all?
 *  3. Which InnerTube clients deliver fetchable formats on this device?
 *  4. Does this device mint PoTokens the SABR server accepts (plan phase 5)?
 *
 * Deliberately free of UI dependencies so the checks can also run from a test
 * or a script.
 */
// @ts-ignore Ignore no type definitions found
import {InnerTubeClient} from "youtubei.js/dist/src/types";

import {Innertube, Misc, Sabr} from "@/utils/Youtube";
import {
  clientNeedsPoToken,
  getContentPoToken,
  poTokenMinter,
} from "@/utils/potoken/PoTokenProvider";

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
  /** Fields of the /next response the app's TV UI needs. */
  nextFields?: string[];
  error?: string;
}

/**
 * Result of the SABR probe — plan phase 6.
 *
 * Answers what the Node run cannot: does `fetch` under Hermes send a POST with
 * a protobuf body the SABR endpoint accepts, and can the UMP response be taken
 * apart on the device? `streamedBody` is the interesting side finding — React
 * Native usually provides no readable `response.body`, so the whole response
 * ends up in memory.
 */
export interface SabrCheck {
  client: string;
  hasSabrUrl: boolean;
  hasUstreamerConfig: boolean;
  videoItag?: number;
  audioItag?: number;
  /** Whether the response was read as a stream or had to be buffered whole. */
  streamedBody?: boolean;
  /**
   * `STREAM_PROTECTION_STATUS` of the response. With a PoToken anything but
   * `ok` means the server did not accept it.
   */
  protectionStatus?: string;
  /**
   * PoToken used for clients that need one (plan phase 5): how long minting
   * took, or why there is none.
   */
  poToken?: {length?: number; ms: number; error?: string};
  formats?: {
    key: string;
    mimeType?: string;
    totalSegments: number;
    durationMs: number;
    /** Size of the init segment and its mp4 boxes (`ftyp moov …` expected). */
    initBytes?: number;
    initBoxes?: string;
    /** First media segment (`moof mdat` expected). */
    segmentBytes?: number;
    segmentBoxes?: string;
  }[];
  /** UMP parts the implementation does not know — a hint at protocol drift. */
  unknownParts?: string[];
  error?: string;
  ms?: number;
}

export interface DiagnosticsResult {
  startedAt: string;
  videoId: string;
  /**
   * Which Innertube instance was checked. Important: the app's login lives on
   * the TV instance (useAccountData.ts uses useYoutubeTVContext), the default
   * instance stays anonymous — a TV result from the wrong instance does not
   * answer the auth question.
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
  /** The path the app actually uses for TV playback. */
  tvNamespace?: TvNamespaceCheck;
  /** Does SABR fetch real segments on this device? */
  sabr?: SabrCheck;
  /**
   * The same probe over `WEB` with a PoToken — only where this device can mint
   * one (plan phase 5).
   */
  sabrWithPoToken?: SabrCheck;
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
    // Exactly the mechanism the shim in src/ytjs/react-native.ts uses —
    // called here on purpose to check precisely that.
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
 * Reads the number of subsegments from a sidx box.
 * Short version of the parser plan phase 2.1 brings into the fork as
 * src/utils/Mp4SidxParser.ts — here only to show feasibility on the device.
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

/* ------------------------------------ Formats --------------------------------- */

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
 * Reads the top-level box types of an mp4 fragment.
 *
 * Enough as an authenticity check: an init segment starts with `ftyp` and
 * carries `moov`, a media segment `moof` + `mdat`. Nobody needs to interpret
 * the bytes in between here.
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

    // 0 means "to the end", 1 means a 64-bit size follows — both end the
    // enumeration here, because the first box type already answers the question.
    if (size < 8) {
      break;
    }

    offset += size;
  }

  return types.join(" ");
}

/**
 * Deliberately picks the **smallest** indexed mp4 formats.
 *
 * The probe checks the mechanism, not the quality — and a round of 2160p
 * costs about 2.5 MB of cellular or Wi-Fi traffic for nothing.
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
 * Fetches one init and one media segment per track over SABR.
 *
 * `VISIONOS` is the default: it stays at `OK` without a PoToken. For clients
 * that need a token (`WEB`) the probe mints one and solves the URL's `n`
 * challenge, as playback does (plan phase 5).
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
  let poToken: string | undefined;

  try {
    if (clientNeedsPoToken(client)) {
      const mintStarted = Date.now();
      poToken = await getContentPoToken(videoId);
      check.poToken = {
        length: poToken?.length,
        ms: Date.now() - mintStarted,
        error: poToken ? undefined : "kein Token (siehe Log POTOKEN)",
      };

      if (!poToken) {
        check.error = "Auf diesem Gerät ließ sich kein PoToken erzeugen";
        return check;
      }
    }

    const info = await youtube.getBasicInfo(videoId, {client} as any);
    const rawStreamingUrl = info.streaming_data?.server_abr_streaming_url;
    const streamingUrl =
      rawStreamingUrl && youtube.session.player
        ? await youtube.session.player.decipher(rawStreamingUrl)
        : rawStreamingUrl;
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
      po_token: poToken,
      // The same fetch function as the rest of the session, so headers and
      // network behaviour do not differ from the other requests.
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

/* ------------------------------------- Run ------------------------------------ */

export async function runDiagnostics(
  youtube: Innertube,
  options?: {
    videoId?: string;
    clients?: InnerTubeClient[];
    label?: string;
    includeTvNamespace?: boolean;
    /**
     * Additionally fetches real segments over SABR (plan phase 6), and where a
     * PoToken can be minted, once more over `WEB` with one (plan phase 5).
     *
     * Measured, each probe costs one extra `/player` request and **one** SABR
     * request of about 110 KB on the wire (80 KB of it segment data) — it picks
     * the smallest mp4 formats. It belongs on the **anonymous** instance: a
     * signed-in session answers non-TV clients with HTTP 400, and SABR needs
     * exactly one of those.
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

    if (poTokenMinter.isSupported) {
      result.sabrWithPoToken = await checkSabr(youtube, videoId, "WEB");
    }
  }

  return result;
}

/**
 * Checks `tv.getInfo()` — the path the app fetches its TV playback through.
 * `/player` and `/next` are separate requests: the TV client can be complete
 * in its metadata and still answer UNPLAYABLE for the player.
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

/** Text lines for one SABR probe. */
function formatSabrCheck(sabr: SabrCheck): string[] {
  const lines: string[] = [];
  lines.push(`SABR (${sabr.client}):`);

  if (sabr.poToken) {
    lines.push(
      sabr.poToken.length
        ? `    PoToken ${sabr.poToken.length} Zeichen in ${sabr.poToken.ms}ms`
        : `    PoToken FEHLT (${sabr.poToken.error}) · ${sabr.poToken.ms}ms`,
    );
  }

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

  return lines;
}

/** Compact text form — for logs and for copying to the clipboard. */
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
    lines.push("", ...formatSabrCheck(result.sabr));
  }

  if (result.sabrWithPoToken) {
    lines.push("", ...formatSabrCheck(result.sabrWithPoToken));
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

/* --------------------------------- Runtime logging ---------------------------- */

/**
 * Compact description of a player response's streaming data — plan phase 0.4.
 * Logged on every video fetch so that, when something fails, it is traceable
 * which client delivered which formats.
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
