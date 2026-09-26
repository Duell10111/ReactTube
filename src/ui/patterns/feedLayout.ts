import {
  getFeedColumnCount,
  getLayoutClass,
  type LayoutClass,
} from "../theme/breakpoints.ts";
import {spacing} from "../theme/spacing.ts";

import type {HorizontalData} from "@/extraction/ShelfExtraction";
import type {ElementData} from "@/extraction/Types";

export type FeedItem = ElementData | HorizontalData;

/**
 * How a shelf is presented. TV keeps the horizontal row it was delivered as;
 * touch layouts flatten it into the vertical feed under its own title, which
 * is what the plan asks for on phones and tablets. Reel shelves stay
 * horizontal everywhere, because a portrait card at full feed width would push
 * everything else off the screen.
 */
export type ShelfPresentation = "horizontal" | "flattened";

export interface FeedMetrics {
  columns: number;
  /** Gap between cards in a row and between rows. */
  gap: number;
  /** Padding around the whole feed. */
  padding: number;
  /** Cards rendered as skeletons while the first page is loading. */
  skeletonCount: number;
  /**
   * Width of a card inside a horizontal shelf. On touch layouts only shorts
   * shelves stay horizontal, so the value there targets a portrait card.
   */
  shelfCardWidth: number;
  shelfPresentation: ShelfPresentation;
}

export interface FeedEdgeInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface FeedContentPadding {
  paddingTop: number;
  paddingBottom: number;
  paddingStart: number;
  paddingEnd: number;
}

/**
 * Padding around the scrollable content of a feed.
 *
 * On touch the surrounding screen already keeps the system safe area, so the
 * feed only adds its own density padding. On TV nothing else does: the padding
 * *is* the overscan-safe margin, and it is asymmetric on purpose — the rail
 * already covers the leading crop, so repeating the full margin there would
 * push every feed a rail width to the right.
 */
export function getFeedContentPadding(
  layout: LayoutClass,
  metrics: FeedMetrics,
  insets: FeedEdgeInsets,
): FeedContentPadding {
  if (layout !== "tv") {
    return {
      paddingTop: metrics.padding,
      paddingBottom: metrics.padding,
      paddingStart: metrics.padding,
      paddingEnd: metrics.padding,
    };
  }

  return {
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingStart: insets.left,
    paddingEnd: insets.right,
  };
}

export interface FeedRowPadding {
  paddingStart: number;
  paddingEnd: number;
}

/**
 * The horizontal part of the feed padding, for the rows that carry it.
 *
 * It deliberately does not live on the scroll container. A horizontal shelf
 * inside a padded container ends where the padding starts, so the row is cut
 * off well before the screen edge and the margin reads as a black band beside
 * it — on TV that also hides the fact that the row continues. Grid rows take
 * the padding themselves and shelves apply it to their own content instead, so
 * a shelf runs to the edge while its first card still starts on the grid.
 */
export function getFeedRowPadding(
  padding: FeedContentPadding,
  minimum = 0,
): FeedRowPadding {
  return {
    paddingStart: Math.max(padding.paddingStart, minimum),
    paddingEnd: Math.max(padding.paddingEnd, minimum),
  };
}

export interface FeedRowLayout {
  /** Margin that belongs outside the feed's focus region. */
  leadingInset: number;
  /** The horizontal padding the rows themselves carry. */
  rowPadding: FeedRowPadding;
}

/**
 * Moves the leading row padding out of the feed on TV.
 *
 * A focus region is a `UIFocusGuide` spanning the whole view it wraps, and the
 * focus engine takes the nearest guide over anything behind it. While the feed
 * region also covered the margin beside the first column, a Left press meant to
 * leave the feed landed in that margin, and the guide handed focus straight
 * back to the card it came from — the navigation rail could never be reached.
 * The margin sits outside the region instead: the region starts exactly at the
 * first card, so nothing stands between that card and the rail. The rows keep
 * the trailing padding, which is the one that lets a shelf run off the edge.
 */
export function splitFeedRowPadding(
  layout: LayoutClass,
  padding: FeedRowPadding,
): FeedRowLayout {
  if (layout !== "tv") {
    return {leadingInset: 0, rowPadding: padding};
  }

  return {
    leadingInset: padding.paddingStart,
    rowPadding: {paddingStart: 0, paddingEnd: padding.paddingEnd},
  };
}

export type FeedRow =
  | {type: "shelf"; key: string; shelf: HorizontalData}
  | {type: "header"; key: string; title: string}
  | {type: "cards"; key: string; items: ElementData[]};

export function isShelfItem(item: FeedItem): item is HorizontalData {
  return "parsedData" in item;
}

/** A shelf of shorts. Its cards are portrait, so it is never flattened. */
export function isReelShelf(shelf: HorizontalData): boolean {
  return (
    shelf.parsedData.length > 0 &&
    shelf.parsedData.every(item => item.type === "reel")
  );
}

/**
 * Layout class of a feed from the width it actually occupies, not from the
 * window. A feed can sit in a column far narrower than the screen — up next
 * beside a player on a tablet is the case this exists for. Judged by the
 * window, that column would be "expanded" and render three columns of cards
 * inside a third of the screen.
 *
 * TV keeps its own class: its feeds always own the content plane, and the
 * plane is translated rather than resized when the rail expands.
 */
export function getFeedLayoutClass(
  measuredWidth: number,
  windowLayout: LayoutClass,
): LayoutClass {
  if (windowLayout === "tv" || measuredWidth <= 0) {
    return windowLayout;
  }

  return getLayoutClass(measuredWidth, false);
}

/**
 * Feed geometry per layout class. TV gets fewer, larger cards at a larger
 * reading distance; compact widths keep a single column so the thumbnail stays
 * the full card width.
 */
export function getFeedMetrics(layout: LayoutClass): FeedMetrics {
  const columns = getFeedColumnCount(layout);

  switch (layout) {
    case "tv":
      return {
        columns,
        gap: spacing.xl,
        padding: spacing.xxl,
        skeletonCount: columns * 2,
        shelfCardWidth: 420,
        shelfPresentation: "horizontal",
      };
    case "compact":
      return {
        columns,
        gap: spacing.lg,
        padding: spacing.none,
        skeletonCount: 4,
        shelfCardWidth: 180,
        shelfPresentation: "flattened",
      };
    case "medium":
    case "expanded":
      return {
        columns,
        gap: spacing.lg,
        padding: spacing.lg,
        skeletonCount: columns * 3,
        shelfCardWidth: 220,
        shelfPresentation: "flattened",
      };
  }
}

/**
 * Width of a single card so a row fills the available width exactly. Rows are
 * laid out from this value instead of from a minimum item size, which keeps the
 * column count stable while the TV content plane is translated.
 */
export function getFeedCardWidth(
  availableWidth: number,
  metrics: FeedMetrics,
  horizontalPadding = metrics.padding * 2,
): number {
  const content =
    availableWidth -
    horizontalPadding -
    metrics.gap * Math.max(0, metrics.columns - 1);

  return Math.max(0, content / metrics.columns);
}

/**
 * Splits a feed into rows. Cards are grouped into rows of `columns`; a shelf
 * either keeps its own full-width row or is flattened into those card rows
 * under a title row, depending on the presentation the layout asks for.
 *
 * Doing this before the list renders keeps shelf and card rows in one list
 * without a grid that has to guess which item spans the full width.
 */
export function buildFeedRows(
  items: FeedItem[],
  columns: number,
  shelfPresentation: ShelfPresentation = "horizontal",
): FeedRow[] {
  const safeColumns = Math.max(1, Math.floor(columns));
  const rows: FeedRow[] = [];
  let pending: ElementData[] = [];

  const flush = () => {
    if (pending.length === 0) {
      return;
    }

    rows.push({
      type: "cards",
      key: `cards-${rows.length}-${pending.map(item => item.id).join("-")}`,
      items: pending,
    });
    pending = [];
  };

  const push = (item: ElementData) => {
    pending.push(item);

    if (pending.length === safeColumns) {
      flush();
    }
  };

  for (const item of items) {
    if (!isShelfItem(item)) {
      push(item);
      continue;
    }

    flush();

    if (shelfPresentation === "horizontal" || isReelShelf(item)) {
      rows.push({
        type: "shelf",
        key: `shelf-${rows.length}-${item.id}`,
        shelf: item,
      });
      continue;
    }

    // An empty shelf would leave a title with nothing under it.
    if (item.parsedData.length === 0) {
      continue;
    }

    if (item.title) {
      rows.push({
        type: "header",
        key: `header-${rows.length}-${item.id}`,
        title: item.title,
      });
    }

    for (const element of item.parsedData) {
      push(element);
    }

    flush();
  }

  flush();

  return rows;
}

export interface FeedSection {
  key: string;
  title?: string;
  data: FeedRow[];
}

/**
 * Groups a feed into titled sections, the shape history and other date-grouped
 * surfaces need. Entries that arrive outside a shelf keep their order in an
 * untitled section instead of being dropped.
 */
export function buildFeedSections(
  items: FeedItem[],
  columns: number,
): FeedSection[] {
  const sections: FeedSection[] = [];
  let loose: ElementData[] = [];

  const flush = () => {
    if (loose.length === 0) {
      return;
    }

    sections.push({
      key: `section-${sections.length}`,
      data: buildFeedRows(loose, columns),
    });
    loose = [];
  };

  for (const item of items) {
    if (isShelfItem(item)) {
      flush();
      sections.push({
        key: `section-${sections.length}-${item.id}`,
        title: item.title,
        data: buildFeedRows(item.parsedData, columns),
      });
      continue;
    }

    loose.push(item);
  }

  flush();

  return sections;
}
