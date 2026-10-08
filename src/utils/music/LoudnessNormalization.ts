/**
 * YouTube measures loudness against a reference of -14 LKFS: `loudness_db` is
 * the offset of a track from it, `*_lkfs`/`perceptual_loudness_db` are the
 * absolute value.
 */
const YOUTUBE_REFERENCE_LKFS = -14;

/**
 * AVPlayer (RNTP on the phone, SwiftAudioEx on the watch) only accepts a
 * volume up to 1.0, so tracks can only be attenuated. Targeting a level below
 * the YouTube reference leaves headroom: quiet tracks are attenuated less, which
 * makes them sound as loud as loud tracks once the system volume is raised.
 */
export const LOUDNESS_NORMALIZATION_HEADROOM_DB = {
  off: undefined,
  standard: 4,
  strong: 8,
} as const;

export type LoudnessNormalizationMode =
  keyof typeof LOUDNESS_NORMALIZATION_HEADROOM_DB;

export const DEFAULT_LOUDNESS_NORMALIZATION_MODE: LoudnessNormalizationMode =
  "standard";

/** Keeps extreme metadata from making a track practically inaudible. */
const MIN_GAIN = 0.1;

interface LoudnessFormat {
  loudness_db?: number;
  track_absolute_loudness_lkfs?: number;
}

interface LoudnessInfo {
  player_config?: {
    audio_config?: {
      loudness_db?: number;
      perceptual_loudness_db?: number;
    };
  };
}

function finite(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function relativeToReference(lkfs: number | undefined): number | undefined {
  const value = finite(lkfs);
  return value === undefined ? undefined : value - YOUTUBE_REFERENCE_LKFS;
}

/**
 * Returns the loudness offset in dB of the played format. Per-format values are
 * preferred because some clients (e.g. VISIONOS) omit the relative value in the
 * player config.
 */
export function getLoudnessDb(
  info: LoudnessInfo | undefined,
  format: LoudnessFormat | undefined,
): number | undefined {
  const audioConfig = info?.player_config?.audio_config;
  return (
    finite(format?.loudness_db) ??
    relativeToReference(format?.track_absolute_loudness_lkfs) ??
    finite(audioConfig?.loudness_db) ??
    relativeToReference(audioConfig?.perceptual_loudness_db)
  );
}

export function parseLoudnessNormalizationMode(
  value: string | undefined,
): LoudnessNormalizationMode {
  return value &&
    Object.prototype.hasOwnProperty.call(
      LOUDNESS_NORMALIZATION_HEADROOM_DB,
      value,
    )
    ? (value as LoudnessNormalizationMode)
    : DEFAULT_LOUDNESS_NORMALIZATION_MODE;
}

/**
 * Player volume (0...1) that brings a track to the target level of `mode`.
 * Tracks without loudness metadata are assumed to sit at the YouTube reference,
 * so they do not jump out next to normalized tracks.
 */
export function getLoudnessGain(
  loudnessDb: number | undefined,
  mode: LoudnessNormalizationMode,
): number {
  const headroomDb = LOUDNESS_NORMALIZATION_HEADROOM_DB[mode];
  if (headroomDb === undefined) {
    return 1;
  }

  const offset = finite(loudnessDb) ?? 0;
  const gain = Math.pow(10, (-offset - headroomDb) / 20);
  return Math.min(1, Math.max(MIN_GAIN, gain));
}
