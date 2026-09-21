import type {LayoutClass} from "@/ui/theme/breakpoints";

export type NavigationMode = "bottomTabs" | "navigationRail" | "tvRail";

export type TVRailState = "hidden" | "collapsed" | "expanded";

export type AppStatusBarStyle = "light-content";

/** The dark theme is the only finalized scheme, so the status bar is fixed. */
export const appStatusBarStyle: AppStatusBarStyle = "light-content";

export const appChromeMetrics = {
  compactHeaderHeight: 56,
  expandedHeaderHeight: 64,
  miniPlayerHeight: 64,
  tabletRailWidth: 80,
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
 * Compact widths keep the bottom navigation, wider touch layouts use an
 * adaptive navigation rail, and TV always uses the dedicated remote rail.
 */
export function getNavigationMode(layout: LayoutClass): NavigationMode {
  switch (layout) {
    case "tv":
      return "tvRail";
    case "compact":
      return "bottomTabs";
    case "medium":
    case "expanded":
      return "navigationRail";
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
  /** Width of the side navigation, `0` while the bottom navigation is used. */
  railWidth: number;
  /** Height of the mini player, `0` while nothing is playing. */
  miniPlayerHeight: number;
  /**
   * Where the mini player is anchored. In bottom navigation mode it is stacked
   * directly on top of the tab bar, in rail mode it floats above the content.
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
    navigationMode === "navigationRail"
      ? appChromeMetrics.tabletRailWidth
      : navigationMode === "tvRail"
        ? tvRailMetrics.collapsedWidth
        : 0;
  const miniPlayerHeight = miniPlayerVisible
    ? appChromeMetrics.miniPlayerHeight
    : 0;

  return {
    navigationMode,
    headerHeight,
    headerTotalHeight: headerHeight + insets.top,
    railWidth,
    miniPlayerHeight,
    miniPlayerOffset:
      navigationMode === "navigationRail"
        ? {
            left: railWidth + insets.left,
            right: insets.right,
            bottom: insets.bottom,
          }
        : {left: 0, right: 0, bottom: 0},
    statusBarStyle: appStatusBarStyle,
  };
}
