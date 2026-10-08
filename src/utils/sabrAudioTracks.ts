/**
 * Audio format choice for SABR playback.
 *
 * A SABR stream carries exactly the audio format it asked for, so a video with
 * several audio tracks (original plus dubs) needs one format per track — and a
 * deliberate choice of which one plays by default. Picking by bitrate alone
 * is wrong: an auto-dubbed track can be a few bytes per second larger than the
 * original and would then silently replace it.
 */

/** The subset of `youtubei.js`'s `Format` this module reads. */
export interface SabrAudioCandidate {
  itag: number;
  mime_type?: string;
  bitrate?: number;
  has_audio?: boolean;
  has_video?: boolean;
  is_drc?: boolean;
  is_original?: boolean;
  audio_track?: {
    id?: string;
    audio_is_default?: boolean;
  };
}

function isUsableAudio(format: SabrAudioCandidate) {
  return (
    !!format.has_audio &&
    !format.has_video &&
    // AVPlayer plays no WebM.
    !!format.mime_type?.includes("mp4")
  );
}

/** Non-DRC first, then the highest bitrate. */
function compareWithinTrack(a: SabrAudioCandidate, b: SabrAudioCandidate) {
  if (!!a.is_drc !== !!b.is_drc) {
    return a.is_drc ? 1 : -1;
  }
  return (b.bitrate ?? 0) - (a.bitrate ?? 0);
}

/**
 * One mp4 audio format per audio track, the default track first.
 *
 * The default is the track YouTube marks as default, then the original, and
 * only without either the one with the highest bitrate. The remaining tracks
 * keep the order of the player response.
 */
export function pickSabrAudioFormats<T extends SabrAudioCandidate>(
  adaptive: readonly T[],
): T[] {
  const byTrack = new Map<string, T[]>();

  for (const format of adaptive) {
    if (!isUsableAudio(format)) {
      continue;
    }
    const key = format.audio_track?.id ?? "";
    const formats = byTrack.get(key) ?? [];
    formats.push(format);
    byTrack.set(key, formats);
  }

  const tracks = [...byTrack.values()].map(
    formats => [...formats].sort(compareWithinTrack)[0],
  );

  const primary =
    tracks.find(format => format.audio_track?.audio_is_default) ??
    tracks.find(format => format.is_original) ??
    [...tracks].sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];

  if (!primary) {
    return [];
  }

  return [primary, ...tracks.filter(format => format !== primary)];
}
