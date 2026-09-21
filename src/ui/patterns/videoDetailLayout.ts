import type {LayoutClass} from "@/ui/theme/breakpoints";

/**
 * How the video detail surface arranges the player and everything around it.
 *
 * - `stacked`: player on top, metadata and up next below it in one column.
 * - `split`: player and metadata in one column, up next beside them.
 * - `tv`: the player owns the screen; panels are laid over it.
 */
export type VideoDetailMode = "stacked" | "split" | "tv";

/** Where description, comments, and queue open. */
export type VideoPanelPresentation = "sheet" | "side";

export interface VideoDetailLayout {
  mode: VideoDetailMode;
  /** Fraction of the width the player column takes, `1` while stacked. */
  playerColumnRatio: number;
  /** The player keeps this ratio on every surface. */
  playerAspectRatio: number;
  panelPresentation: VideoPanelPresentation;
  /** Metadata scrolls inside the player column instead of above the feed. */
  metadataBesidePlayer: boolean;
  /**
   * Everything that is not the video is trimmed: no description preview and a
   * single metadata line. True where vertical space is the scarce resource.
   */
  reducedChrome: boolean;
}

export interface VideoDetailLayoutInput {
  layout: LayoutClass;
  landscape: boolean;
}

export const videoPlayerAspectRatio = 16 / 9;

/**
 * Split ratios per layout class. A phone in landscape keeps a slightly wider
 * side column than a tablet, because its up next entries are the same width
 * while the screen is much narrower.
 */
const splitPlayerRatio: Record<Exclude<LayoutClass, "tv">, number> = {
  compact: 0.62,
  medium: 0.6,
  expanded: 0.65,
};

/**
 * Landscape is the trigger for the split, not the device class: a phone in
 * landscape has the same problem a tablet has — a 16:9 player plus a vertical
 * feed below it leaves neither of them a usable height.
 */
export function getVideoDetailLayout({
  layout,
  landscape,
}: VideoDetailLayoutInput): VideoDetailLayout {
  if (layout === "tv") {
    return {
      mode: "tv",
      playerColumnRatio: 1,
      playerAspectRatio: videoPlayerAspectRatio,
      panelPresentation: "side",
      metadataBesidePlayer: false,
      reducedChrome: true,
    };
  }

  if (!landscape) {
    return {
      mode: "stacked",
      playerColumnRatio: 1,
      playerAspectRatio: videoPlayerAspectRatio,
      panelPresentation: "sheet",
      metadataBesidePlayer: false,
      reducedChrome: false,
    };
  }

  return {
    mode: "split",
    playerColumnRatio: splitPlayerRatio[layout],
    playerAspectRatio: videoPlayerAspectRatio,
    panelPresentation: "sheet",
    metadataBesidePlayer: true,
    // A phone in landscape is roughly 390 points high. Everything that is not
    // the video has to earn its space there; a tablet does not have that problem.
    reducedChrome: layout === "compact",
  };
}

/**
 * Player height for a given container. The player keeps 16:9 in every mode, so
 * the height follows from the width of its column and never from the screen.
 */
export function getPlayerHeight(
  containerWidth: number,
  layout: VideoDetailLayout,
): number {
  const columnWidth = containerWidth * layout.playerColumnRatio;

  return Math.round(columnWidth / layout.playerAspectRatio);
}
