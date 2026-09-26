/**
 * Metadata of a lockup — the view model YouTube delivers related videos,
 * playlists and newer feeds as.
 *
 * A lockup carries what the older renderers carried, but nowhere near where
 * they carried it: the author, the count and the date sit in nested metadata
 * rows instead of in named fields, and the duration is a badge on the
 * thumbnail rather than an overlay of its own. The parsing lives here, in
 * plain functions over the node shapes, so it can be tested without a
 * response.
 */

/** Matches durations like "1:02" or "1:02:03". */
const durationPattern = /^\d{1,2}(:\d{2}){1,2}$/;

/** True for a badge text that is a duration rather than "LIVE", "4K" or "New". */
export function isDurationLabel(text?: string): boolean {
  return Boolean(text && durationPattern.test(text));
}

interface TextLike {
  text?: string;
}

interface MetadataPartLike {
  text?: TextLike | null;
}

interface MetadataRowLike {
  metadata_parts?: MetadataPartLike[];
}

export interface LockupMetadata {
  author?: string;
  /** View count, or the concurrent viewers while the video is live. */
  count?: string;
  published?: string;
}

/**
 * Author, count, and publish date out of a lockup's metadata rows.
 *
 * The rows are read by position, which the parts inside them do not allow:
 * the first row names the channel, the rest carry the counts. A row can also
 * hold nothing but badges ("Auto-dubbed") — those are dropped, so a video
 * carrying one is read the same as a video without.
 *
 * The count and the date are taken in the order they arrive rather than
 * classified. A live video sends only its viewers ("13K watching") and a video
 * hiding its views only its date, and both end up in the same single metadata
 * line, so the order is what matters and the meaning of each part does not.
 */
export function parseLockupMetadataRows(
  rows?: MetadataRowLike[],
): LockupMetadata {
  const texts = (rows ?? [])
    .map(row =>
      (row.metadata_parts ?? [])
        .map(part => part.text?.text?.trim())
        .filter((text): text is string => Boolean(text)),
    )
    .filter(row => row.length > 0);

  if (texts.length === 0) {
    return {};
  }

  const [first, ...rest] = texts;
  // A playlist names its owner and then labels itself ("Playlist"); only the
  // first part of the row is the author on every content type.
  const [count, published] = rest.flat();

  return {author: first[0], count, published};
}

interface BadgeLike {
  text?: string;
  badge_style?: string;
  icon_name?: string;
}

/**
 * A thumbnail carries overlays of several kinds and only some of them hold
 * badges, so the node type is part of the shape: without it TypeScript reads
 * an overlay that has neither field as a mistake rather than as one of the
 * kinds this skips.
 */
interface OverlayLike {
  type?: string;
  badges?: BadgeLike[];
  progress_bar?: {start_percent?: number} | null;
}

/**
 * The bare count out of a phrased badge ("20 videos" → "20").
 *
 * The app phrases the count itself, from its own translations, and every other
 * extractor hands it a bare number. Reading the digits back out keeps the
 * lockup in line with them instead of producing "20 videos videos".
 */
function getBadgeCount(text?: string): string | undefined {
  return text?.match(/\d+(?:[.,\s]\d+)*/)?.[0];
}

export interface LockupThumbnailBadges {
  duration?: string;
  livestream: boolean;
  /** Entry count of a playlist lockup, as a bare number. */
  videoCount?: string;
  /** Watch progress between 0 and 1, set only where there is progress. */
  progress?: number;
}

/**
 * The badges a lockup draws on its thumbnail. Which ones it has says what the
 * lockup is: a duration or "LIVE" for a video, an entry count for a playlist.
 * Everything else ("New", "4K") is decoration and is dropped.
 */
export function parseLockupThumbnailBadges(
  overlays?: OverlayLike[],
): LockupThumbnailBadges {
  const result: LockupThumbnailBadges = {livestream: false};

  for (const overlay of overlays ?? []) {
    const percent = overlay.progress_bar?.start_percent;

    if (typeof percent === "number" && percent > 0) {
      result.progress = Math.min(percent / 100, 1);
    }

    for (const badge of overlay.badges ?? []) {
      if (badge.badge_style?.endsWith("LIVE")) {
        result.livestream = true;
      } else if (isDurationLabel(badge.text)) {
        result.duration = badge.text;
      } else if (badge.icon_name === "PLAYLISTS") {
        result.videoCount = getBadgeCount(badge.text);
      }
    }
  }

  return result;
}
