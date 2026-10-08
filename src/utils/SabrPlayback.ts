/**
 * SABR playback through the local server — plan phase 6.5.
 *
 * The phase 2c path stores playlists as files and lets AVPlayer fetch the
 * segments straight from googlevideo. SABR cannot do that: there are no
 * segment URLs to write into a playlist — the server decides per segment what
 * it sends, and the bytes only exist once requested. So an address in between
 * is needed, and `modules/media-server` provides it.
 *
 * The layout:
 *
 * ```
 *   AVPlayer                     media-server (Swift)            SabrSegmentSource (JS)
 *      │  GET /…/master.m3u8  ──▶  registered text
 *      │  GET /…/seg/401:/42.m4s ─▶ onSegmentRequest  ──────────▶  getSegment("401:", 42)
 *      │                             respondToSegment ◀──────────  Bytes
 * ```
 *
 * **One variant, no ladder.** With SABR the server adapts; a stream carries
 * exactly the formats it requested. The codec choice therefore happens here in
 * format selection, not in the manifest.
 *
 * **One stream per extra audio track.** For the same reason a video with dubs
 * would offer only one language. Every further track therefore gets its own
 * audio-only stream; the manifest lists them all as renditions, and AVPlayer
 * only pulls segments from the one that is selected.
 */
import MediaServer from "../../modules/media-server";

import Logger from "@/utils/Logger";
import {Sabr, YT} from "@/utils/Youtube";
import {pickSabrAudioFormats} from "@/utils/sabrAudioTracks";
import {parseSabrSegmentPath} from "@/utils/sabrSegmentPath";

const LOGGER = Logger.extend("PLAYBACK");

/** The segments live under this prefix; the playlists sit next to it. */
const SEGMENT_SEGMENT = "seg";

/** From here on the stream counts as dead and failures are only logged. */
const MAX_CONSECUTIVE_FAILURES = 3;

export interface SabrPlaybackOptions {
  /**
   * Allow AV1.
   *
   * A deliberate choice, as with the app's own manifest: without a hardware
   * decoder the player sits silently in its loading state instead of reporting
   * an error. Only Apple TV 4K (3rd gen) decodes av01.
   */
  allowAv1?: boolean;
  maxHeight?: number;
}

export interface SabrPlaybackSource {
  /** What goes into the player's source. */
  masterUri: string;
  /** Selected formats — for the log. */
  videoItag?: number;
  audioItag?: number;
  /** Ends the stream and registrations. Must run when the screen is left. */
  stop: () => Promise<void>;
}

/** Only path separation on loopback, not a security boundary. */
function randomToken(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Picks the video format and one audio format per audio track; the first
 * audio format is the default track.
 *
 * mp4 is mandatory (AVPlayer plays no WebM), and the codec order matches the
 * app's own manifest: avc1 first, av01 only when allowed.
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

  // The first allowed family provides the format; av01 only contributes
  // heights avc1 does not reach. Without that, a device without an AV1 decoder
  // would get 2160p av01 here and hang.
  const primary = families.find(candidate =>
    videos.some(format => family(format) === candidate),
  );
  const video = videos.find(format => family(format) === primary);

  return {video, audios: pickSabrAudioFormats(adaptive)};
}

function toFormatId(format: any) {
  return {
    itag: format.itag,
    lastModified: Number(format.last_modified_ms ?? 0),
    xtags: format.xtags ?? undefined,
  };
}

/**
 * Sets up a SABR stream and makes it playable through the local server.
 *
 * Returns `undefined` when this path is not possible — the next ladder stage
 * takes over. A failure here is not exceptional but normal operation for
 * clients the SABR endpoint does not serve.
 */
export async function startSabrPlayback(
  info: YT.VideoInfo,
  options: {
    videoId: string;
    client: string;
    clientVersion: string;
    /** Content-bound PoToken for clients that need one (plan phase 5). */
    poToken?: string;
    /**
     * Mints a replacement after the server did not accept `poToken`. Called
     * at most once per start.
     */
    refreshPoToken?: () => Promise<string | undefined>;
    /**
     * Solves the `n` challenge of the streaming URL (`Player#decipher`).
     * Without it `WEB` answers 403; `VISIONOS`/`IOS` URLs pass unchanged.
     */
    decipherUrl?: (url: string) => Promise<string>;
  } & SabrPlaybackOptions,
): Promise<SabrPlaybackSource | undefined> {
  const started = Date.now();

  const rawStreamingUrl = info.streaming_data?.server_abr_streaming_url;
  const ustreamerConfig = (info as any).player_config?.media_common_config
    ?.media_ustreamer_request_config?.video_playback_ustreamer_config;

  if (!rawStreamingUrl || !ustreamerConfig) {
    LOGGER.debug("SABR: die Player-Antwort trägt keine SABR-Eingaben");
    return undefined;
  }

  const {video, audios} = pickFormats(info, options);
  const [audio, ...extraAudios] = audios;

  if (!video || !audio) {
    LOGGER.debug("SABR: keine passenden mp4-Formate für Bild und Ton");
    return undefined;
  }

  type SegmentSource = InstanceType<typeof Sabr.SabrSegmentSource>;

  let source: SegmentSource | undefined;
  /** Audio-only sources of the extra tracks, closed together with `source`. */
  const extraSources: SegmentSource[] = [];
  let subscription: {remove: () => void} | undefined;

  try {
    const streamingUrl = options.decipherUrl
      ? await options.decipherUrl(rawStreamingUrl).catch(error => {
          LOGGER.warn(
            `SABR: could not solve the URL's n challenge: ${error?.message ?? error}`,
          );
          return rawStreamingUrl;
        })
      : rawStreamingUrl;

    // The first round brings format metadata and init segments — without
    // them there is no segment plan and therefore no playlist.
    const open = async (poToken?: string) => {
      const stream = new Sabr.SabrStream({
        server_abr_streaming_url: streamingUrl,
        ustreamer_config: ustreamerConfig,
        client_name: options.client,
        client_version: options.clientVersion,
        video_format_id: toFormatId(video),
        audio_format_id: toFormatId(audio),
        video_id: options.videoId,
        po_token: poToken,
      });
      const segmentSource = new Sabr.SabrSegmentSource(stream);
      // Tracked outside so the error path below can close it.
      source = segmentSource;
      return {stream, segmentSource, formats: await segmentSource.open()};
    };

    let poToken = options.poToken;
    let opened = await open(poToken);

    // A token the server accepted turns the status to `ok` right away; one it
    // did not leaves it `pending`, and the stream dies at the first seek.
    // BotGuard runs vary, so one fresh token is worth a try.
    if (
      options.poToken &&
      opened.stream.protection_status !== "ok" &&
      options.refreshPoToken
    ) {
      LOGGER.info(
        `SABR: PoToken not accepted (${opened.stream.protection_status}), minting a fresh one`,
      );
      await opened.segmentSource.close().catch(() => {});
      poToken = await options.refreshPoToken();
      opened = await open(poToken);
    }

    const {formats, segmentSource} = opened;

    if (opened.stream.protection_status !== "ok") {
      LOGGER.info(
        `SABR: stream protection ${opened.stream.protection_status} via ${options.client}; ` +
          "the stream may stop after a seek",
      );
    }
    const index = await Sabr.buildSabrHlsIndex(segmentSource);
    const sourceByKey = new Map<string, SegmentSource>(
      Object.keys(index).map(key => [key, segmentSource]),
    );

    // In parallel and individually fallible: a missing dub only drops that
    // language, it must not cost the whole stream.
    const extraTracks = await Promise.all(
      extraAudios.map(async extra => {
        const extraSource = new Sabr.SabrSegmentSource(
          new Sabr.SabrStream({
            server_abr_streaming_url: streamingUrl,
            ustreamer_config: ustreamerConfig,
            client_name: options.client,
            client_version: options.clientVersion,
            audio_format_id: toFormatId(extra),
            enabled_track_types: Sabr.EnabledTrackTypes.AUDIO_ONLY,
            video_id: options.videoId,
            po_token: poToken,
          }),
        );
        extraSources.push(extraSource);

        try {
          await extraSource.open();
          return {
            source: extraSource,
            index: await Sabr.buildSabrHlsIndex(extraSource),
          };
        } catch (error: any) {
          LOGGER.warn(
            `SABR: audio track ${extra.audio_track?.id ?? extra.itag} unavailable: ` +
              `${error?.message ?? error}`,
          );
          return undefined;
        }
      }),
    );

    for (const track of extraTracks) {
      if (!track) {
        continue;
      }
      for (const [key, schedule] of Object.entries(track.index)) {
        if (!sourceByKey.has(key)) {
          index[key] = schedule;
          sourceByKey.set(key, track.source);
        }
      }
    }

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

    // The master sits next to the media playlists because it references them
    // by relative name; the segments live one level deeper so their prefix
    // does not shadow the playlists.
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
    const sourceFor = (formatKey: string) =>
      sourceByKey.get(formatKey) ?? segmentSource;
    /**
     * Consecutive failures.
     *
     * In a device run a broken stream answered every request with 503;
     * AVPlayer retried the same one for three minutes and only then gave up
     * with `NSURLErrorDomain -1008`. Three minutes of standstill are worse than
     * stepping down to the next ladder stage at once.
     */
    let consecutiveFailures = 0;

    subscription = MediaServer.addListener(
      "onSegmentRequest",
      ({requestId, path}) => {
        // Every request **must** be answered, even on failure: otherwise the
        // connection waits for the native timeout and the player stands still
        // that long.
        const answer = async () => {
          try {
            const request = parseSabrSegmentPath(segmentRoot, path);

            if (!request) {
              MediaServer.failSegment(requestId, 404, "Unbekannter Pfad");
              return;
            }

            if (request.kind === "init") {
              const data = await sourceFor(request.formatKey).getInit(
                request.formatKey,
              );
              MediaServer.respondToSegment(requestId, data, "video/mp4");
              return;
            }

            const data = await sourceFor(request.formatKey).getSegment(
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

            // 404 rather than 503: a 5xx invites AVPlayer to retry, a 404 says
            // "does not exist" and leads to the error faster — and with it to
            // the next stage.
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
        `${formats.length} Formate · ` +
        `${1 + extraTracks.filter(Boolean).length}/${audios.length} audio tracks · ` +
        `Port ${port} · ${Date.now() - started}ms`,
    );

    const activeSubscription = subscription;

    return {
      masterUri: `${base}/master.m3u8`,
      videoItag: video.itag,
      audioItag: audio.itag,
      stop: async () => {
        activeSubscription.remove();
        await Promise.all(
          [segmentSource, ...extraSources].map(each =>
            each.close().catch(() => {}),
          ),
        );
        await MediaServer.stopServer();
      },
    };
  } catch (error: any) {
    LOGGER.warn(`SABR nicht möglich: ${error?.message ?? error}`);
    subscription?.remove();
    await source?.close().catch(() => {});
    await Promise.all(extraSources.map(each => each.close().catch(() => {})));
    return undefined;
  }
}
