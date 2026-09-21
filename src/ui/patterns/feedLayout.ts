import {getFeedColumnCount, type LayoutClass} from "../theme/breakpoints.ts";
import {spacing} from "../theme/spacing.ts";

import type {HorizontalData} from "@/extraction/ShelfExtraction";
import type {ElementData} from "@/extraction/Types";

export type FeedItem = ElementData | HorizontalData;

export interface FeedMetrics {
  columns: number;
  /** Gap between cards in a row and between rows. */
  gap: number;
  /** Padding around the whole feed. */
  padding: number;
  /** Cards rendered as skeletons while the first page is loading. */
  skeletonCount: number;
  /** Width of a card inside a horizontal shelf. */
  shelfCardWidth: number;
}

export type FeedRow =
  | {type: "shelf"; key: string; shelf: HorizontalData}
  | {type: "cards"; key: string; items: ElementData[]};

export function isShelfItem(item: FeedItem): item is HorizontalData {
  return "parsedData" in item;
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
      };
    case "compact":
      return {
        columns,
        gap: spacing.lg,
        padding: spacing.none,
        skeletonCount: 4,
        shelfCardWidth: 240,
      };
    case "medium":
    case "expanded":
      return {
        columns,
        gap: spacing.lg,
        padding: spacing.lg,
        skeletonCount: columns * 3,
        shelfCardWidth: 300,
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
): number {
  const content =
    availableWidth -
    metrics.padding * 2 -
    metrics.gap * Math.max(0, metrics.columns - 1);

  return Math.max(0, content / metrics.columns);
}

/**
 * Splits a feed into rows. Shelves always occupy a full-width row of their own,
 * cards are grouped into rows of `columns`. Doing this before the list renders
 * keeps shelf and card rows in one list without a grid that has to guess which
 * item spans the full width.
 */
export function buildFeedRows(items: FeedItem[], columns: number): FeedRow[] {
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

  for (const item of items) {
    if (isShelfItem(item)) {
      flush();
      rows.push({
        type: "shelf",
        key: `shelf-${rows.length}-${item.id}`,
        shelf: item,
      });
      continue;
    }

    pending.push(item);

    if (pending.length === safeColumns) {
      flush();
    }
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
