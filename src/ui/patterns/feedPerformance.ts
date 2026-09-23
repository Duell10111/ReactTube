import type {LayoutClass} from "../theme/breakpoints.ts";

/**
 * The virtualization settings a feed list runs with. They are a layout decision
 * rather than a per-screen one, so every migrated feed scrolls the same way.
 */
export interface ListPerformance {
  initialNumToRender: number;
  maxToRenderPerBatch: number;
  updateCellsBatchingPeriod: number;
  windowSize: number;
  removeClippedSubviews: boolean;
}

/**
 * Virtualization and remote focus pull in opposite directions.
 *
 * A pointer can scroll to content that does not exist yet — the list mounts it
 * on the way. A D-pad cannot: focus only moves to a view that is already
 * mounted, so the row below the last rendered one is not merely invisible, it
 * is unreachable, and the remote stops dead at the edge of the window. TV
 * therefore keeps a deeper window and renders a batch ahead of the viewport.
 *
 * `removeClippedSubviews` is the same trap in its sharpest form and stays off
 * on TV: a clipped subview is detached from the native view tree and cannot be
 * focused, which loses focus outright when the focused card is scrolled to the
 * edge. The setting buys nothing on a screen that renders four columns.
 */
export function getFeedListPerformance(layout: LayoutClass): ListPerformance {
  if (layout === "tv") {
    return {
      initialNumToRender: 4,
      maxToRenderPerBatch: 4,
      updateCellsBatchingPeriod: 50,
      windowSize: 9,
      removeClippedSubviews: false,
    };
  }

  return {
    initialNumToRender: 6,
    maxToRenderPerBatch: 6,
    updateCellsBatchingPeriod: 50,
    windowSize: 11,
    removeClippedSubviews: false,
  };
}

/**
 * A horizontal shelf is the long list on TV: a single row can carry a hundred
 * entries and the remote walks it one card at a time, so the window ahead of
 * the focused card matters more than the one below it in a grid.
 */
export function getShelfListPerformance(layout: LayoutClass): ListPerformance {
  const feed = getFeedListPerformance(layout);

  if (layout === "tv") {
    return {
      ...feed,
      initialNumToRender: 6,
      maxToRenderPerBatch: 6,
      windowSize: 7,
    };
  }

  return {
    ...feed,
    initialNumToRender: 4,
    maxToRenderPerBatch: 4,
    windowSize: 5,
  };
}
