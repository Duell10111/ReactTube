export const darkColors = {
  background: "#0F0F0F",
  surface: "#181818",
  surfaceRaised: "#212121",
  surfacePressed: "#303030",
  divider: "#3F3F3F",
  focus: "#FFFFFF",
  focusResting: "transparent",
  textPrimary: "#F1F1F1",
  textSecondary: "#AAAAAA",
  textDisabled: "#717171",
  brand: "#7C83FD",
  onBrand: "#0F0F0F",
  mediaProgress: "#FF0033",
  live: "#FF0033",
  scrim: "rgba(0, 0, 0, 0.72)",
  success: "#5BB974",
  warning: "#F9AB00",
  error: "#F28B82",
} as const;

export type AppColors = typeof darkColors;
