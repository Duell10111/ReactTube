import type {ElementData} from "@/extraction/Types";
import type {TranslationKey} from "@/localization/en";
import type {TranslationValues} from "@/localization/types";

export type Translate = (
  key: TranslationKey,
  values?: TranslationValues,
) => string;

export type MediaCardKind = "video" | "reel" | "mix" | "playlist" | "channel";

/**
 * Thumbnail geometry of a card. The shape is the only geometry difference
 * between the card variants, so phone, tablet, and TV stay in sync.
 */
export type MediaCardShape = "wide" | "portrait" | "circle";

export type MediaCardBadgeTone = "neutral" | "live";

export interface MediaCardBadge {
  id: "duration" | "live" | "mix" | "videoCount" | "downloaded";
  label: string;
  tone: MediaCardBadgeTone;
  /** Material icon name, set where the badge is more readable with one. */
  icon?: "record" | "playlist-play" | "download-done";
}

export interface MediaCardAuthor {
  id: string;
  name: string;
  thumbnailUrl?: string;
}

export interface MediaCardViewModel {
  id: string;
  kind: MediaCardKind;
  shape: MediaCardShape;
  aspectRatio: number;
  title: string;
  /** Already ordered metadata parts, at most three entries. */
  metadata: string[];
  /** The metadata parts as one line, the form every card renders. */
  metadataLine: string;
  author?: MediaCardAuthor;
  thumbnailUrl?: string;
  badges: MediaCardBadge[];
  /** Watch progress between 0 and 1, only set when there is progress. */
  progress?: number;
  accessibilityLabel: string;
  accessibilityHint: string;
}

export const mediaCardAspectRatio: Record<MediaCardShape, number> = {
  wide: 16 / 9,
  portrait: 9 / 16,
  circle: 1,
};

const metadataSeparator = " · ";

/** At most three parts keeps the metadata within its two-line budget. */
const maxMetadataParts = 3;

function getMediaCardKind(element: ElementData): MediaCardKind {
  switch (element.type) {
    case "video":
      return "video";
    case "reel":
      return "reel";
    case "mix":
      return "mix";
    case "playlist":
    case "album":
      return "playlist";
    case "channel":
    case "artist":
    case "profile":
      return "channel";
  }
}

function getMediaCardShape(kind: MediaCardKind): MediaCardShape {
  switch (kind) {
    case "reel":
      return "portrait";
    case "channel":
      return "circle";
    default:
      return "wide";
  }
}

/**
 * Watch progress as a fraction. Values outside the range are clamped instead of
 * dropped, because a progress bar wider than its track is the worse failure.
 */
function getMediaCardProgress(element: ElementData): number | undefined {
  const progress =
    "thumbnailOverlays" in element
      ? element.thumbnailOverlays?.videoProgress
      : undefined;

  if (typeof progress !== "number" || Number.isNaN(progress)) {
    return undefined;
  }

  if (progress <= 0) {
    return undefined;
  }

  return Math.min(progress, 1);
}

function compact(values: (string | undefined | null)[]): string[] {
  return values
    .map(value => value?.trim())
    .filter((value): value is string => Boolean(value));
}

function getMetadata(element: ElementData, translate: Translate): string[] {
  switch (element.type) {
    case "channel":
    case "artist":
    case "profile":
      return compact([element.subscribers, element.subtitle]).slice(
        0,
        maxMetadataParts,
      );
    case "playlist":
    case "album":
      return compact([
        element.author?.name ?? element.artists?.[0]?.name,
        element.videoCount
          ? translate("media.videoCount", {count: element.videoCount})
          : undefined,
      ]).slice(0, maxMetadataParts);
    default: {
      const parts = compact([
        element.author?.name ?? element.artists?.[0]?.name,
        element.short_views,
        element.publishDate,
      ]);

      // Some surfaces only deliver a pre-composed subtitle. It is the fallback,
      // not the default, so cards built from full metadata stay comparable.
      return (parts.length > 0 ? parts : compact([element.subtitle])).slice(
        0,
        maxMetadataParts,
      );
    }
  }
}

function getBadges(
  element: ElementData,
  translate: Translate,
): MediaCardBadge[] {
  const badges: MediaCardBadge[] = [];

  switch (element.type) {
    case "channel":
    case "artist":
    case "profile":
      return badges;
    case "playlist":
    case "album":
      if (element.videoCount) {
        badges.push({
          id: "videoCount",
          label: translate("media.videoCount", {count: element.videoCount}),
          tone: "neutral",
        });
      }

      return badges;
    default:
      break;
  }

  if (element.livestream) {
    badges.push({
      id: "live",
      label: translate("media.badge.live"),
      tone: "live",
      icon: "record",
    });
  } else if (element.duration) {
    badges.push({id: "duration", label: element.duration, tone: "neutral"});
  }

  if (element.type === "mix") {
    badges.push({
      id: "mix",
      label: translate("media.badge.mix"),
      tone: "neutral",
      icon: "playlist-play",
    });
  }

  if (element.downloaded) {
    badges.push({
      id: "downloaded",
      label: translate("media.badge.downloaded"),
      tone: "neutral",
      icon: "download-done",
    });
  }

  return badges;
}

function getAccessibilityHint(
  kind: MediaCardKind,
  translate: Translate,
): string {
  switch (kind) {
    case "playlist":
      return translate("media.hint.playlist");
    case "channel":
      return translate("media.hint.channel");
    default:
      return translate("media.hint.video");
  }
}

interface MediaCardViewModelOptions {
  translate: Translate;
}

/**
 * The shared data view behind every media card. Phone, tablet, and TV render it
 * differently, but they never compute badges, metadata, or labels themselves.
 */
export function createMediaCardViewModel(
  element: ElementData,
  {translate}: MediaCardViewModelOptions,
): MediaCardViewModel {
  const kind = getMediaCardKind(element);
  const shape = getMediaCardShape(kind);
  const metadata = getMetadata(element, translate);
  const badges = getBadges(element, translate);
  const progress = getMediaCardProgress(element);
  const author =
    element.author ?? ("artists" in element ? element.artists?.[0] : undefined);

  const spokenBadges = badges
    .filter(badge => badge.id !== "duration")
    .map(badge => badge.label);
  const spokenProgress =
    progress !== undefined
      ? [translate("media.progress", {percent: Math.round(progress * 100)})]
      : [];

  return {
    id: element.id,
    kind,
    shape,
    aspectRatio: mediaCardAspectRatio[shape],
    title: element.title,
    metadata,
    metadataLine: metadata.join(metadataSeparator),
    author: author
      ? {
          id: author.id,
          name: author.name,
          thumbnailUrl: author.thumbnail?.url,
        }
      : undefined,
    thumbnailUrl: element.thumbnailImage?.url,
    badges,
    progress,
    accessibilityLabel: compact([
      element.title,
      ...metadata,
      ...spokenBadges,
      ...spokenProgress,
    ]).join(", "),
    accessibilityHint: getAccessibilityHint(kind, translate),
  };
}
