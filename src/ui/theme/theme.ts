import {DarkTheme as NavigationDarkTheme} from "@react-navigation/native";
import {MD3DarkTheme, type MD3Theme} from "react-native-paper";

import {darkColors} from "./colors";
import {motion} from "./motion";
import {radii} from "./radii";

export const navigationTheme = {
  ...NavigationDarkTheme,
  colors: {
    ...NavigationDarkTheme.colors,
    primary: darkColors.brand,
    background: darkColors.background,
    card: darkColors.surface,
    text: darkColors.textPrimary,
    border: darkColors.divider,
    notification: darkColors.mediaProgress,
  },
};

export const paperTheme: MD3Theme = {
  ...MD3DarkTheme,
  roundness: radii.control,
  animation: {
    ...MD3DarkTheme.animation,
    scale: 1,
    defaultAnimationDuration: motion.duration.standard,
  },
  colors: {
    ...MD3DarkTheme.colors,
    primary: darkColors.brand,
    primaryContainer: darkColors.surfacePressed,
    secondary: darkColors.textSecondary,
    secondaryContainer: darkColors.surfaceRaised,
    tertiary: darkColors.mediaProgress,
    tertiaryContainer: darkColors.surfaceRaised,
    background: darkColors.background,
    surface: darkColors.surface,
    surfaceVariant: darkColors.surfaceRaised,
    surfaceDisabled: darkColors.surfacePressed,
    onPrimary: darkColors.onBrand,
    onPrimaryContainer: darkColors.textPrimary,
    onSecondary: darkColors.background,
    onSecondaryContainer: darkColors.textPrimary,
    onTertiary: darkColors.textPrimary,
    onTertiaryContainer: darkColors.textPrimary,
    onBackground: darkColors.textPrimary,
    onSurface: darkColors.textPrimary,
    onSurfaceVariant: darkColors.textSecondary,
    onSurfaceDisabled: darkColors.textDisabled,
    error: darkColors.error,
    errorContainer: darkColors.surfaceRaised,
    onError: darkColors.background,
    onErrorContainer: darkColors.error,
    outline: darkColors.divider,
    outlineVariant: darkColors.surfacePressed,
    inverseSurface: darkColors.textPrimary,
    inverseOnSurface: darkColors.background,
    inversePrimary: darkColors.brand,
    shadow: darkColors.scrim,
    scrim: darkColors.scrim,
    backdrop: darkColors.scrim,
    elevation: {
      level0: darkColors.focusResting,
      level1: darkColors.surface,
      level2: darkColors.surfaceRaised,
      level3: darkColors.surfaceRaised,
      level4: darkColors.surfacePressed,
      level5: darkColors.surfacePressed,
    },
  },
};
