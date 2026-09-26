import {
  getTVContentInsets,
  getTVOverscanInsets,
  zeroOverscanInsets,
  type TVOverscanInsets,
  type TVSurfaceSize,
} from "./tvOverscan.ts";

import type {LayoutClass} from "@/ui/theme/breakpoints";

export type NavigationMode = "bottomTabs" | "tvRail";

export type TVRailState = "hidden" | "collapsed" | "expanded";

export type AppStatusBarStyle = "light-content";

/** The dark theme is the only finalized scheme, so the status bar is fixed. */
export const appStatusBarStyle: AppStatusBarStyle = "light-content";

export const appChromeMetrics = {
  compactHeaderHeight: 56,
  expandedHeaderHeight: 64,
  miniPlayerHeight: 64,
  minimumTouchTarget: 48,
} as const;

export const tvRailMetrics = {
  collapsedWidth: 96,
  expandedWidth: 320,
  itemHeight: 72,
  selectionIndicatorWidth: 4,
  /**
   * Where a destination starts inside the rail.
   *
   * The rail is chrome at the screen edge and deliberately does *not* carry the
   * full title-safe margin: doing so made it 156 points wide and left an empty
   * strip beside every icon for a crop most panels no longer apply. It keeps
   * half the margin instead, so a mild overscan clips nothing and a severe one
   * reaches the outer edge of an icon — never a card, a title, or a label. The
   * content beside it still keeps the full margin.
   */
  leadingInset: 24,
} as const;

/**
 * Every touch layout keeps the bottom navigation; only TV uses the dedicated
 * remote rail. Tablets adapt through content density — more feed columns and a
 * taller header — not through a different navigation pattern, so the
 * destinations sit in the same place on every touch device.
 */
export function getNavigationMode(layout: LayoutClass): NavigationMode {
  switch (layout) {
    case "tv":
      return "tvRail";
    case "compact":
    case "medium":
    case "expanded":
      return "bottomTabs";
  }
}

export function getTVRailWidth(state: TVRailState): number {
  switch (state) {
    case "hidden":
      return 0;
    case "collapsed":
      return tvRailMetrics.collapsedWidth;
    case "expanded":
      return tvRailMetrics.expandedWidth;
  }
}

/**
 * The amount the rail grows when it expands. The content plane moves by exactly
 * this value so the rail pushes the content instead of overlapping it.
 */
export function getTVRailGrowth(): number {
  return tvRailMetrics.expandedWidth - tvRailMetrics.collapsedWidth;
}

/**
 * The content plane keeps this width in every rail state. Only its offset
 * changes, which keeps column count, card size, and scroll position stable.
 */
export function getContentPlaneWidth(screenWidth: number): number {
  return Math.max(0, screenWidth - tvRailMetrics.collapsedWidth);
}

export function getContentPlaneOffset(state: TVRailState): number {
  switch (state) {
    case "hidden":
      return -tvRailMetrics.collapsedWidth;
    case "collapsed":
      return 0;
    case "expanded":
      return getTVRailGrowth();
  }
}

export function resolveTVRailState(
  hidden: boolean,
  expanded: boolean,
): TVRailState {
  if (hidden) {
    return "hidden";
  }

  return expanded ? "expanded" : "collapsed";
}

export interface ChromeEdgeInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface ChromeLayoutInput {
  layout: LayoutClass;
  insets: ChromeEdgeInsets;
  miniPlayerVisible: boolean;
  /**
   * Logical size of the surface. Only TV needs it, and only to derive its
   * overscan margin; every touch layout gets its insets from the system.
   */
  size?: TVSurfaceSize;
}

export interface ChromeLayout {
  navigationMode: NavigationMode;
  /** Header height without the safe area. */
  headerHeight: number;
  /** Header height including the top safe area. */
  headerTotalHeight: number;
  /** Width of the TV rail, `0` on every touch layout. */
  railWidth: number;
  /**
   * The margin a screen inside the content plane has to keep free. On touch it
   * is the system safe area, on TV the overscan-safe margin.
   */
  contentInsets: ChromeEdgeInsets;
  /** The TV overscan margin itself, `0` on every touch layout. */
  overscanInsets: TVOverscanInsets;
  /** Height of the mini player, `0` while nothing is playing. */
  miniPlayerHeight: number;
  /**
   * Where the mini player is anchored. It is stacked directly on top of the
   * bottom navigation, which is the tab bar's own position.
   */
  miniPlayerOffset: {left: number; right: number; bottom: number};
  statusBarStyle: AppStatusBarStyle;
}

function getHeaderHeight(layout: LayoutClass): number {
  switch (layout) {
    case "tv":
      return 0;
    case "compact":
      return appChromeMetrics.compactHeaderHeight;
    case "medium":
    case "expanded":
      return appChromeMetrics.expandedHeaderHeight;
  }
}

/**
 * Single source for the app shell measurements. Header, safe areas, side
 * navigation, and mini player are derived here so they cannot drift apart.
 */
export function getChromeLayout({
  layout,
  insets,
  miniPlayerVisible,
  size,
}: ChromeLayoutInput): ChromeLayout {
  const navigationMode = getNavigationMode(layout);
  const headerHeight = getHeaderHeight(layout);
  const tv = navigationMode === "tvRail";
  const overscanInsets =
    tv && size ? getTVOverscanInsets(size) : zeroOverscanInsets;
  const railWidth = tv ? getTVRailWidth("collapsed") : 0;
  const contentInsets =
    tv && size ? getTVContentInsets(size, railWidth) : insets;
  const miniPlayerHeight = miniPlayerVisible
    ? appChromeMetrics.miniPlayerHeight
    : 0;

  return {
    navigationMode,
    headerHeight,
    headerTotalHeight: headerHeight + insets.top,
    railWidth,
    contentInsets,
    overscanInsets,
    miniPlayerHeight,
    miniPlayerOffset: {left: 0, right: 0, bottom: 0},
    statusBarStyle: appStatusBarStyle,
  };
}
