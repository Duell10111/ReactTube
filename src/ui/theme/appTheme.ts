import {darkColors, type AppColors} from "./colors";
import {getControlMetrics, type ControlMetrics} from "./controls";
import {motion} from "./motion";
import {radii} from "./radii";
import {spacing} from "./spacing";
import {getThemeTypographyTarget} from "./themeSelection";
import {
  phoneTypography,
  tvTypography,
  type TypographyScale,
} from "./typography";

export type AppThemeName = "dark";

export interface AppTheme {
  name: AppThemeName;
  dark: true;
  colors: AppColors;
  spacing: typeof spacing;
  radii: typeof radii;
  motion: typeof motion;
  typography: TypographyScale;
  controls: ControlMetrics;
}

export function createAppTheme(isTV = false): AppTheme {
  const typographyTarget = getThemeTypographyTarget(isTV);

  return {
    name: "dark",
    dark: true,
    colors: darkColors,
    spacing,
    radii,
    motion,
    typography: typographyTarget === "tv" ? tvTypography : phoneTypography,
    controls: getControlMetrics(isTV),
  };
}
