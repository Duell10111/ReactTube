export type ThemeTypographyTarget = "phone" | "tv";

export function getThemeTypographyTarget(isTV: boolean): ThemeTypographyTarget {
  return isTV ? "tv" : "phone";
}
