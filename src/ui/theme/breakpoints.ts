export const layoutBreakpoints = {
  medium: 600,
  expanded: 1024,
} as const;

export type LayoutClass = "compact" | "medium" | "expanded" | "tv";

export function getLayoutClass(width: number, isTV = false): LayoutClass {
  if (isTV) {
    return "tv";
  }

  if (width < layoutBreakpoints.medium) {
    return "compact";
  }

  if (width < layoutBreakpoints.expanded) {
    return "medium";
  }

  return "expanded";
}

export function getFeedColumnCount(layout: LayoutClass): number {
  switch (layout) {
    case "compact":
      return 1;
    case "medium":
      return 2;
    case "expanded":
      return 3;
    case "tv":
      return 4;
  }
}
