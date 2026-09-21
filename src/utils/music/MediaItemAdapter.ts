import type {MediaItem} from "@rntp/player";

import type {AudioPlaybackSource, YTTrackInfo} from "../../extraction/Types";

export function audioSourceToMediaItem(
  track: YTTrackInfo,
  source: AudioPlaybackSource,
): MediaItem {
  const playbackEndPosition =
    source.kind !== "youtube-hls" &&
    track.durationSeconds &&
    Number.isFinite(track.durationSeconds) &&
    track.durationSeconds > 0
      ? track.durationSeconds
      : undefined;

  return {
    mediaId: track.id,
    url: source.url,
    title: track.title,
    artist: track.author?.name ?? track.channel?.name,
    artworkUrl: track.thumbnailImage?.url,
    duration: track.durationSeconds,
    endPosition: playbackEndPosition,
    mimeType: source.mimeType,
    extras: {
      sourceKind: source.kind,
      ...(source.client ? {client: source.client} : {}),
      ...(source.expires ? {expiresAt: source.expires.getTime()} : {}),
      ...(source.formatItag ? {formatItag: source.formatItag} : {}),
    },
  };
}
