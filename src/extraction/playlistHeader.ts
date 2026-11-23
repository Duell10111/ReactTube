export type PlaylistPrivacy = "public" | "unlisted" | "private";

/** The facts a playlist header shows below its title. */
export interface PlaylistHeaderDetails {
  ownerName?: string;
  privacy?: PlaylistPrivacy;
  /** Counts as YouTube words them, e.g. "45 videos" and "No views". */
  stats: string[];
}

/** One item of a TV header byline: either text or an icon badge. */
export interface BylineItem {
  text?: string;
  badgeIcon?: string;
}

const separators = new Set(["•", "·"]);

function getPrivacyFromIcon(icon: string | undefined) {
  switch (icon) {
    case "PRIVACY_PRIVATE":
      return "private";
    case "PRIVACY_UNLISTED":
      return "unlisted";
    case "PRIVACY_PUBLIC":
      return "public";
    default:
      return undefined;
  }
}

/**
 * Reads the bylines of a TV playlist header. The TV client delivers them as
 * one line — a privacy badge, the owner, then the counts, separated by
 * bullets — and no structured fields, so the owner is taken from the first
 * text item.
 */
export function parseTVPlaylistBylines(
  lines: BylineItem[][],
): PlaylistHeaderDetails {
  const texts: string[] = [];
  let privacy: PlaylistPrivacy | undefined;

  for (const item of lines.flat()) {
    privacy ??= getPrivacyFromIcon(item.badgeIcon);
    const text = item.text?.trim();

    if (text && !separators.has(text)) {
      texts.push(text);
    }
  }

  const [ownerName, ...stats] = texts;

  return {ownerName, privacy, stats};
}

/** Maps the classic playlist's privacy string, e.g. "PRIVATE". */
export function parseClassicPlaylistPrivacy(
  privacy: string | undefined,
): PlaylistPrivacy | undefined {
  switch (privacy?.toUpperCase()) {
    case "PRIVATE":
      return "private";
    case "UNLISTED":
      return "unlisted";
    case "PUBLIC":
      return "public";
    default:
      return undefined;
  }
}
