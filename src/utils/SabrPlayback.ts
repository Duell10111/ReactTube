/**
 * SABR-Wiedergabe über den lokalen Server — Plan-Phase 6.5.
 *
 * Der Weg aus Phase 2c legt Playlists als Dateien ab und lässt AVPlayer die
 * Segmente direkt bei googlevideo holen. Bei SABR geht das nicht: es gibt keine
 * Segment-URLs, die man in eine Playlist schreiben könnte — der Server entscheidet
 * segmentweise, was er sendet, und die Bytes entstehen erst beim Abruf. Also
 * braucht es eine Adresse dazwischen, und die liefert `modules/media-server`.
 *
 * Der Aufbau:
 *
 * ```
 *   AVPlayer                     media-server (Swift)            SabrSegmentSource (JS)
 *      │  GET /…/master.m3u8  ──▶  abgelegter Text
 *      │  GET /…/seg/401:/42.m4s ─▶ onSegmentRequest  ──────────▶  getSegment("401:", 42)
 *      │                             respondToSegment ◀──────────  Bytes
 * ```
 *
 * **Eine Variante, keine Leiter.** Bei SABR adaptiert der Server; ein Strom trägt
 * genau die Formate, die er angefragt bekam. Die Codec-Wahl passiert deshalb hier
 * bei der Formatauswahl, nicht im Manifest.
 */
import MediaServer from "../../modules/media-server";

import Logger from "@/utils/Logger";
import {Sabr, YT} from "@/utils/Youtube";
import {parseSabrSegmentPath} from "@/utils/sabrSegmentPath";

const LOGGER = Logger.extend("PLAYBACK");

/** Unter diesem Präfix liegen die Segmente; daneben die Playlists. */
const SEGMENT_SEGMENT = "seg";

/** Ab hier gilt der Strom als hinüber und es wird nur noch protokolliert. */
const MAX_CONSECUTIVE_FAILURES = 3;

export interface SabrPlaybackOptions {
  /**
   * AV1 zulassen.
   *
   * Wie beim eigenen Manifest eine bewusste Entscheidung: ohne Hardware-Decoder
   * bleibt der Player stumm im Ladezustand stehen, statt einen Fehler zu melden.
   * Nur Apple TV 4K (3. Gen) dekodiert av01.
   */
  allowAv1?: boolean;
  maxHeight?: number;
}

export interface SabrPlaybackSource {
  /** Was in die Quelle des Players geht. */
  masterUri: string;
  /** Gewählte Formate — fürs Protokoll. */
  videoItag?: number;
  audioItag?: number;
  /** Beendet Strom und Registrierungen. Muss zum Verlassen des Screens laufen. */
  stop: () => Promise<void>;
}

/** Nur Pfadtrennung auf Loopback, keine Sicherheitsgrenze. */
function randomToken(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Wählt Video- und Tonformat für den Strom.
 *
 * mp4 ist Pflicht (AVPlayer spielt kein WebM), und die Codec-Reihenfolge
 * entspricht dem eigenen Manifest: avc1 zuerst, av01 nur wenn erlaubt.
 */
function pickFormats(info: YT.VideoInfo, options: SabrPlaybackOptions) {
  const adaptive = info.streaming_data?.adaptive_formats ?? [];
  const families = options.allowAv1 ? ["avc1", "av01"] : ["avc1"];

  const family = (format: any) =>
    /codecs="([^".]+)/.exec(format.mime_type ?? "")?.[1] ?? "";

  const videos = adaptive
    .filter(
      (format: any) =>
        format.has_video &&
        !format.has_audio &&
        format.mime_type?.includes("mp4") &&
        families.includes(family(format)) &&
        (!options.maxHeight || (format.height ?? 0) <= options.maxHeight),
    )
    .sort((a: any, b: any) => (b.height ?? 0) - (a.height ?? 0));

  // Die erste erlaubte Familie stellt das Format; av01 steuert nur Höhen bei,
  // die avc1 nicht erreicht. Ohne das bekäme ein Gerät ohne AV1-Decoder hier
  // 2160p av01 und bliebe hängen.
  const primary = families.find(candidate =>
    videos.some(format => family(format) === candidate),
  );
  const video = videos.find(format => family(format) === primary);

  const audio = adaptive
    .filter(
      (format: any) =>
        format.has_audio &&
        !format.has_video &&
        format.mime_type?.includes("mp4"),
    )
    .sort((a: any, b: any) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];

  return {video, audio};
}

function toFormatId(format: any) {
  return {
    itag: format.itag,
    lastModified: Number(format.last_modified_ms ?? 0),
    xtags: format.xtags ?? undefined,
  };
}

/**
 * Baut einen SABR-Strom auf und macht ihn über den lokalen Server spielbar.
 *
 * Gibt `undefined` zurück, wenn dieser Weg nicht möglich ist — dann übernimmt
 * die nächste Stufe der Ladder. Ein Fehlschlag hier ist kein Ausnahmefall,
 * sondern der Normalbetrieb für Clients, die der SABR-Endpunkt nicht bedient.
 */
export async function startSabrPlayback(
  info: YT.VideoInfo,
  options: {
    videoId: string;
    client: string;
    clientVersion: string;
    poToken?: string;
  } & SabrPlaybackOptions,
): Promise<SabrPlaybackSource | undefined> {
  const started = Date.now();

  const streamingUrl = info.streaming_data?.server_abr_streaming_url;
  const ustreamerConfig = (info as any).player_config?.media_common_config
    ?.media_ustreamer_request_config?.video_playback_ustreamer_config;

  if (!streamingUrl || !ustreamerConfig) {
    LOGGER.debug("SABR: die Player-Antwort trägt keine SABR-Eingaben");
    return undefined;
  }

  const {video, audio} = pickFormats(info, options);

  if (!video || !audio) {
    LOGGER.debug("SABR: keine passenden mp4-Formate für Bild und Ton");
    return undefined;
  }

  let source: InstanceType<typeof Sabr.SabrSegmentSource> | undefined;
  let subscription: {remove: () => void} | undefined;

  try {
    const stream = new Sabr.SabrStream({
      server_abr_streaming_url: streamingUrl,
      ustreamer_config: ustreamerConfig,
      client_name: options.client,
      client_version: options.clientVersion,
      video_format_id: toFormatId(video),
      audio_format_id: toFormatId(audio),
      video_id: options.videoId,
      po_token: options.poToken,
    });

    source = new Sabr.SabrSegmentSource(stream);

    // Die erste Runde bringt Formatmetadaten und Init-Segmente — ohne sie gibt
    // es keinen Segmentplan und damit keine Playlist.
    const formats = await source.open();
    const index = await Sabr.buildSabrHlsIndex(source);

    const {port} = await MediaServer.startServer();
    const token = randomToken();
    const root = `/sabr/${token}`;
    const base = `http://127.0.0.1:${port}${root}`;

    const manifest = await info.toHLS({
      manifest_options: {
        mode: "segments",
        sabr: {base_url: `${base}/${SEGMENT_SEGMENT}`, index},
      },
    });

    // Das Master liegt neben den Medien-Playlists, weil es sie mit relativem
    // Namen referenziert; die Segmente liegen eine Ebene tiefer, damit ihr
    // Präfix die Playlists nicht überdeckt.
    MediaServer.registerText(
      `${root}/master.m3u8`,
      manifest.master,
      "application/vnd.apple.mpegurl",
    );

    for (const playlist of manifest.playlists) {
      MediaServer.registerText(
        `${root}/${playlist.name}`,
        playlist.content,
        "application/vnd.apple.mpegurl",
      );
    }

    const segmentRoot = `${root}/${SEGMENT_SEGMENT}/`;
    const activeSource = source;
    /**
     * Fehlschläge in Folge.
     *
     * Beim Gerätelauf beantwortete ein defekter Strom jede Anfrage mit 503;
     * AVPlayer wiederholte dieselbe drei Minuten lang und gab erst dann mit
     * `NSURLErrorDomain -1008` auf. Drei Minuten Stillstand sind schlimmer als
     * ein sofortiger Abstieg auf die nächste Ladder-Stufe.
     */
    let consecutiveFailures = 0;

    subscription = MediaServer.addListener(
      "onSegmentRequest",
      ({requestId, path}) => {
        // Jede Anfrage **muss** beantwortet werden, auch im Fehlerfall: sonst
        // wartet die Verbindung den nativen Zeitablauf ab und der Player steht
        // so lange still.
        const answer = async () => {
          try {
            const request = parseSabrSegmentPath(segmentRoot, path);

            if (!request) {
              MediaServer.failSegment(requestId, 404, "Unbekannter Pfad");
              return;
            }

            if (request.kind === "init") {
              const data = await activeSource.getInit(request.formatKey);
              MediaServer.respondToSegment(requestId, data, "video/mp4");
              return;
            }

            const data = await activeSource.getSegment(
              request.formatKey,
              request.sequenceNumber,
            );
            MediaServer.respondToSegment(requestId, data, "video/iso.segment");
            consecutiveFailures = 0;
          } catch (error: any) {
            consecutiveFailures++;

            LOGGER.warn(
              `SABR: Segment ${path} nicht geliefert (${consecutiveFailures}. in Folge): ` +
                `${error?.message ?? error}`,
            );

            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
              LOGGER.warn(
                `SABR: ${consecutiveFailures} Fehlschläge in Folge — der Strom ist ` +
                  "hinüber. Weitere Anfragen werden sofort abgewiesen, damit die " +
                  "Ladder absteigt statt zu warten.",
              );
            }

            // 404 statt 503: ein 5xx lädt AVPlayer zum Wiederholen ein, ein 404
            // sagt „gibt es nicht" und führt schneller zum Fehler — und damit
            // zur nächsten Stufe.
            MediaServer.failSegment(
              requestId,
              404,
              String(error?.message ?? error),
            );
          }
        };

        answer().catch(reason => LOGGER.warn(reason));
      },
    );

    MediaServer.registerStreamPrefix(`${root}/${SEGMENT_SEGMENT}`);

    LOGGER.info(
      `SABR bereit über ${options.client}: itag ${video.itag}+${audio.itag} · ` +
        `${formats.length} Formate · Port ${port} · ${Date.now() - started}ms`,
    );

    const activeSubscription = subscription;

    return {
      masterUri: `${base}/master.m3u8`,
      videoItag: video.itag,
      audioItag: audio.itag,
      stop: async () => {
        activeSubscription.remove();
        await activeSource.close();
        await MediaServer.stopServer();
      },
    };
  } catch (error: any) {
    LOGGER.warn(`SABR nicht möglich: ${error?.message ?? error}`);
    subscription?.remove();
    await source?.close().catch(() => {});
    return undefined;
  }
}
