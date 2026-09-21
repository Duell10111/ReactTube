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
  focusBorderWidth: 3,
  selectionIndicatorWidth: 4,
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
}

export interface ChromeLayout {
  navigationMode: NavigationMode;
  /** Header height without the safe area. */
  headerHeight: number;
  /** Header height including the top safe area. */
  headerTotalHeight: number;
  /** Width of the TV rail, `0` on every touch layout. */
  railWidth: number;
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
}: ChromeLayoutInput): ChromeLayout {
  const navigationMode = getNavigationMode(layout);
  const headerHeight = getHeaderHeight(layout);
  const railWidth =
    navigationMode === "tvRail" ? tvRailMetrics.collapsedWidth : 0;
  const miniPlayerHeight = miniPlayerVisible
    ? appChromeMetrics.miniPlayerHeight
    : 0;

  return {
    navigationMode,
    headerHeight,
    headerTotalHeight: headerHeight + insets.top,
    railWidth,
    miniPlayerHeight,
    miniPlayerOffset: {left: 0, right: 0, bottom: 0},
    statusBarStyle: appStatusBarStyle,
  };
}
