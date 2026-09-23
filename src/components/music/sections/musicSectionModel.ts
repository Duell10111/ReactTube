import type {
  HorizontalData,
  HorizontalDataButton,
} from "@/extraction/ShelfExtraction";
import type {ElementData} from "@/extraction/Types";

/**
 * How a YouTube Music section is laid out.
 *
 * Music does not deliver a feed of equal tiles the way the classic app does.
 * It delivers shelves, and a shelf says itself which of the three forms it is:
 * a column-wise list of tracks (`numItemsPerColumn` above one), a row of cover
 * cards, or a piece of prose with no items at all.
 */
export type MusicSectionKind = "description" | "tracks" | "carousel";

export type MusicCardShape = "square" | "wide" | "circle";

export interface MusicSectionModel {
  id: string;
  kind: MusicSectionKind;
  title?: string;
  /** Kicker above the title, e.g. "SENDER". YouTube calls it the strapline. */
  strapline?: string;
  items: ElementData[];
  /** Entries per column of a track shelf; `0` for every other kind. */
  rows: number;
  /** The shelf's own play action, rendered next to the title. */
  playAll?: HorizontalDataButton;
}

/** Horizontal margin of the music surfaces, matching the original app. */
export const musicSurfacePadding = 16;

/**
 * More rows than this do not fit on a phone without shrinking the rows below a
 * comfortable touch target, and YouTube Music itself never ships more.
 */
export const maxTrackShelfRows = 4;

/** Part of the next column kept visible so a track shelf reads as scrollable. */
export const trackColumnPeek = 36;

const trackColumnPeekShare = 0.12;

const musicCardWidth: Record<MusicCardShape, number> = {
  square: 152,
  wide: 248,
  circle: 152,
};

/**
 * Share of the surface a card may take. It only bites on narrow phones: it
 * keeps a second card on screen, which is what makes a row look like a row.
 */
const musicCardWidthShare: Record<MusicCardShape, number> = {
  square: 0.42,
  wide: 0.72,
  circle: 0.42,
};

const minMusicCardWidth = 112;

/** Above this ratio a thumbnail is a video frame, below it is cover art. */
const wideAspectRatio = 1.3;

export function getTrackShelfRows(itemsPerColumn?: number): number {
  if (!itemsPerColumn || !Number.isFinite(itemsPerColumn)) {
    return 0;
  }

  // One item per column is a row of cards, not a list.
  return itemsPerColumn > 1
    ? Math.min(Math.floor(itemsPerColumn), maxTrackShelfRows)
    : 0;
}

export function createMusicSectionModel(
  data: HorizontalData,
): MusicSectionModel {
  const items = data.parsedData ?? [];
  const rows = getTrackShelfRows(data.items_per_columns);
  const title = data.title?.trim();
  const strapline = data.subtitle?.trim();

  return {
    id: data.id,
    kind: items.length === 0 ? "description" : rows > 0 ? "tracks" : "carousel",
    title: title ? title : undefined,
    strapline: strapline ? strapline : undefined,
    items,
    rows,
    playAll: data.buttons?.find(button => button.type === "PLAY"),
  };
}

/**
 * A track shelf is filled top to bottom, then left to right: entry two sits
 * under entry one, not beside it. Chunking by row count reproduces that.
 */
export function buildTrackColumns(
  items: ElementData[],
  rows: number,
): ElementData[][] {
  const size = Math.max(1, rows);
  const columns: ElementData[][] = [];

  for (let index = 0; index < items.length; index += size) {
    columns.push(items.slice(index, index + size));
  }

  return columns;
}

export function getMusicCardShape(element: ElementData): MusicCardShape {
  if (
    element.type === "channel" ||
    element.type === "artist" ||
    element.type === "profile"
  ) {
    return "circle";
  }

  const thumbnail = element.thumbnailImage;

  // Music ships square cover art for songs, albums, and playlists and a 16:9
  // frame for videos, so the image itself already says which card it belongs in.
  return thumbnail?.width && thumbnail?.height
    ? thumbnail.width / thumbnail.height >= wideAspectRatio
      ? "wide"
      : "square"
    : "square";
}

export function getMusicCardWidth(
  shape: MusicCardShape,
  containerWidth: number,
): number {
  const preferred = musicCardWidth[shape];

  if (!(containerWidth > 0)) {
    return preferred;
  }

  return Math.round(
    Math.max(
      minMusicCardWidth,
      Math.min(preferred, containerWidth * musicCardWidthShare[shape]),
    ),
  );
}

export function getTrackColumnWidth(
  containerWidth: number,
  columnCount: number,
): number {
  if (!(containerWidth > 0)) {
    return 0;
  }

  // A single column has nothing to page to, so it takes the full width instead
  // of leaving a gap where the next column would have peeked in.
  if (columnCount <= 1) {
    return Math.round(containerWidth);
  }

  return Math.round(
    containerWidth -
      Math.min(trackColumnPeek, containerWidth * trackColumnPeekShare),
  );
}

/**
 * The second line of a music entry. Music composes it itself ("Album • Artist •
 * 2019"), and that line is the one the original app shows, so it wins over the
 * parts the shared card model assembles.
 */
export function getMusicSubtitle(
  element: ElementData,
  fallback?: string,
): string | undefined {
  const subtitle = element.subtitle?.trim();

  if (subtitle) {
    return subtitle;
  }

  const composed = fallback?.trim();

  return composed ? composed : undefined;
}
