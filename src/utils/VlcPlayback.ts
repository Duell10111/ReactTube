/**
 * Format choice and player options for the VLC player.
 *
 * VLC decodes in software what AVPlayer cannot: YouTube ships 1440p/2160p only
 * as AV1 (mp4) or VP9 (WebM), and Apple TV 4K (3rd generation) has a hardware
 * decoder for neither. Measured on that device with TVVLCKit (libvlc 3.0.x):
 * VP9 2160p60 keeps up for a sustained minute, AV1 2160p60 does not (it
 * drops to about 33 frames per second after ten seconds). So VLC gets VP9 for
 * the heights avc1 does not reach and leaves AV1 out entirely.
 *
 * VLC plays the adaptive formats directly instead of through a manifest:
 * the video URL is the media, the audio URL is attached as an input slave.
 * That needs a client whose byte ranges are not capped (see
 * `YouTube.js/docs/byte-range-cap.md`), which `PlaybackSource.ts` takes care
 * of.
 */
import {
  pickSabrAudioFormats,
  type SabrAudioCandidate,
} from "./sabrAudioTracks.ts";

/** The subset of `youtubei.js`'s `Format` this module reads. */
export interface VlcFormatCandidate extends SabrAudioCandidate {
  height?: number;
  fps?: number;
  url?: string;
  signature_cipher?: string;
}

/** The streams VLC plays, before the URLs are deciphered. */
export interface VlcFormatSelection<T extends VlcFormatCandidate> {
  video: T;
  /** Missing when the response carries no usable audio format. */
  audio?: T;
}

/**
 * The codec family of a format, e.g. `avc1`, `vp9` or `av01`.
 *
 * YouTube spells VP9 both as `vp9` and as `vp09.<profile>…` depending on the
 * client; both end up as `vp9` here. Profile 2 (10-bit, used for HDR) is
 * reported separately as `vp9.2`.
 */
function codecFamily(mimeType: string | undefined): string {
  const codecs = /codecs="([^"]+)"/.exec(mimeType ?? "")?.[1] ?? "";

  if (codecs === "vp9.2" || codecs.startsWith("vp09.02")) {
    return "vp9.2";
  }
  if (codecs === "vp9" || codecs.startsWith("vp09.")) {
    return "vp9";
  }

  return codecs.split(".")[0];
}

/**
 * Whether VLC gets this video format.
 *
 * avc1 is decoded in hardware through VideoToolbox, VP9 in software. HDR
 * (`vp9.2`) stays out because VLC 3 renders it in SDR without proper tone
 * mapping, and AV1 because it does not keep up at 2160p60 (see above).
 */
function isPlayableVideo(format: VlcFormatCandidate): boolean {
  if (!format.has_video || format.has_audio) {
    return false;
  }

  const family = codecFamily(format.mime_type);

  return (
    (family === "avc1" && !!format.mime_type?.includes("mp4")) ||
    (family === "vp9" && !!format.mime_type?.includes("webm"))
  );
}

/**
 * Highest resolution first, then the higher frame rate. At the same height
 * avc1 wins over VP9, because the hardware decoder costs no CPU — VP9 only
 * contributes the heights avc1 does not reach.
 */
function compareVideo(a: VlcFormatCandidate, b: VlcFormatCandidate): number {
  const height = (b.height ?? 0) - (a.height ?? 0);
  if (height !== 0) {
    return height;
  }

  const fps = (b.fps ?? 0) - (a.fps ?? 0);
  if (fps !== 0) {
    return fps;
  }

  const avc1First =
    Number(codecFamily(b.mime_type) === "avc1") -
    Number(codecFamily(a.mime_type) === "avc1");
  if (avc1First !== 0) {
    return avc1First;
  }

  return (b.bitrate ?? 0) - (a.bitrate ?? 0);
}

/**
 * Picks the video and the audio format VLC plays.
 *
 * @param options.maxHeight - Highest video height to consider.
 * @returns `undefined` when no video format qualifies; the playback ladder
 *   then continues with the next step.
 */
export function pickVlcFormats<T extends VlcFormatCandidate>(
  adaptive: readonly T[],
  options?: {maxHeight?: number},
): VlcFormatSelection<T> | undefined {
  const video = adaptive
    .filter(
      format =>
        isPlayableVideo(format) &&
        (!options?.maxHeight || (format.height ?? 0) <= options.maxHeight) &&
        (!!format.url || !!format.signature_cipher),
    )
    .sort(compareVideo)[0];

  if (!video) {
    return undefined;
  }

  // The default audio track — the original, not an auto-dub — comes first.
  return {video, audio: pickSabrAudioFormats(adaptive)[0]};
}

/**
 * libvlc options for a VLC source.
 *
 * The VLC player on iOS/tvOS only takes options for the whole player, not per
 * media. That is enough here, because every source gets its own player.
 *
 * @param options.audioUrl - Separate audio stream, played in sync as an
 *   input slave.
 * @param options.startSeconds - Position to start at.
 */
export function buildVlcInitOptions(options: {
  audioUrl?: string;
  startSeconds?: number;
}): string[] {
  const initOptions = [
    // A larger buffer than VLC's default of one second: a 2160p VP9 stream
    // runs at about 27 Mbit/s.
    "--network-caching=3000",
  ];

  if (options.audioUrl) {
    initOptions.push(`--input-slave=${options.audioUrl}`);
  }

  if (options.startSeconds && options.startSeconds > 0) {
    initOptions.push(`--start-time=${options.startSeconds.toFixed(3)}`);
  }

  return initOptions;
}
