import type {AudioPlaybackSource} from "@/extraction/Types";
import Logger from "@/utils/Logger";
import {AUDIO_PLAYBACK_RESOLVER_PROFILE} from "@/utils/PlaybackClientProfiles";
import {resolvePlaybackInfo} from "@/utils/PlaybackResolver";
import {Innertube, Misc, YT, YTNodes} from "@/utils/Youtube";

export {audioSourceToMediaItem} from "./MediaItemAdapter";

const LOGGER = Logger.extend("MUSIC_SOURCE");

export interface ResolvedAudioStreamingSource {
  source: AudioPlaybackSource;
  /** Fehlt ausschließlich beim lokalen Download. */
  info?: YT.VideoInfo;
}

interface ResolveAudioStreamingSourceOptions {
  localUrl?: string;
}

function hasFetchableUrl(format: Misc.Format): boolean {
  return !!(format.url || format.signature_cipher || format.cipher);
}

function isOriginalAudio(format: Misc.Format): boolean {
  return (
    format.is_original === true || format.audio_track?.audio_is_default === true
  );
}

/**
 * Bevorzugt AAC/MP4 in Originalsprache ohne DRC/Voice Boost. Jede Stufe bleibt
 * ein Fallback, damit abweichende ältere Antworten trotzdem abspielbar sind.
 */
export function choosePreferredAudioFormat(
  info: YT.VideoInfo,
): Misc.Format | undefined {
  const audioFormats = [
    ...(info.streaming_data?.formats ?? []),
    ...(info.streaming_data?.adaptive_formats ?? []),
  ].filter(
    format => format.has_audio && !format.has_video && hasFetchableUrl(format),
  );

  const normalVolume = (format: Misc.Format) => !format.is_drc && !format.is_vb;
  const mp4 = (format: Misc.Format) => format.mime_type.includes("audio/mp4");

  const preferenceTiers = [
    (format: Misc.Format) =>
      mp4(format) && isOriginalAudio(format) && normalVolume(format),
    (format: Misc.Format) => mp4(format) && normalVolume(format),
    (format: Misc.Format) => isOriginalAudio(format) && normalVolume(format),
    normalVolume,
    (format: Misc.Format) => mp4(format) && isOriginalAudio(format),
    mp4,
    () => true,
  ];

  for (const accepts of preferenceTiers) {
    const candidates = audioFormats
      .filter(accepts)
      .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));

    if (candidates.length > 0) {
      return candidates[0];
    }
  }

  return undefined;
}

function validExpiry(expires: Date | undefined): Date | undefined {
  return expires && Number.isFinite(expires.getTime()) ? expires : undefined;
}

/**
 * Löst genau eine RNTP-taugliche Audioquelle auf. Lokale Dateien gewinnen vor
 * Netzwerkquellen; online wird zuerst der ungekappt ausliefernde VISIONOS-Client
 * versucht und YouTube-HLS nur verwendet, wenn keine Audio-Datei entschlüsselt
 * werden kann.
 */
export async function resolveAudioStreamingSource(
  youtube: Innertube | undefined,
  target: string | YTNodes.NavigationEndpoint,
  options?: ResolveAudioStreamingSourceOptions,
): Promise<ResolvedAudioStreamingSource | undefined> {
  if (options?.localUrl) {
    return {
      source: {
        kind: "local",
        url: options.localUrl,
        mimeType: "audio/mp4",
      },
    };
  }

  if (!youtube) {
    LOGGER.warn("Audio-Auflösung vor Initialisierung der YouTube-Session.");
    return undefined;
  }

  const resolved = await resolvePlaybackInfo(youtube, target, {
    ...AUDIO_PLAYBACK_RESOLVER_PROFILE,
    accept: info =>
      info.playability_status?.status === "OK" &&
      !!choosePreferredAudioFormat(info),
    acceptFallback: info =>
      info.playability_status?.status === "OK" &&
      (!!choosePreferredAudioFormat(info) ||
        !!info.streaming_data?.hls_manifest_url),
  });

  if (!resolved) {
    return undefined;
  }

  const expires = validExpiry(resolved.info.streaming_data?.expires);
  const format = choosePreferredAudioFormat(resolved.info);

  if (format) {
    try {
      const url = await format.decipher(youtube.session.player);

      if (url) {
        LOGGER.info(
          `Audio von ${resolved.client} · itag ${format.itag} · ${format.mime_type}`,
        );
        return {
          info: resolved.info,
          source: {
            kind: "direct",
            url,
            mimeType: format.mime_type.split(";")[0],
            client: resolved.client,
            expires,
            formatItag: format.itag,
          },
        };
      }
    } catch (error: any) {
      LOGGER.warn(
        `Audio-Deciphering fehlgeschlagen (itag ${format.itag}): ${String(
          error?.message ?? error,
        )}`,
      );
    }
  }

  const hlsUrl = resolved.info.streaming_data?.hls_manifest_url;
  if (hlsUrl) {
    LOGGER.info(`Audio-Fallback über YouTube-HLS von ${resolved.client}`);
    return {
      info: resolved.info,
      source: {
        kind: "youtube-hls",
        url: hlsUrl,
        mimeType: "application/x-mpegURL",
        client: resolved.client,
        expires,
      },
    };
  }

  LOGGER.warn(`${resolved.client} lieferte keine nutzbare Audioquelle.`);
  return undefined;
}
