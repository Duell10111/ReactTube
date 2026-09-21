import type {TextStyle} from "react-native";

export type TypographyRole =
  | "display"
  | "titleLarge"
  | "titleMedium"
  | "titleSmall"
  | "body"
  | "bodySmall"
  | "label"
  | "labelSmall";

export interface TypographyToken {
  fontSize: number;
  lineHeight: number;
  fontWeight: NonNullable<TextStyle["fontWeight"]>;
  maxLines: number;
}

export type TypographyScale = Record<TypographyRole, TypographyToken>;

export const phoneTypography: TypographyScale = {
  display: {fontSize: 32, lineHeight: 38, fontWeight: "700", maxLines: 2},
  titleLarge: {fontSize: 24, lineHeight: 30, fontWeight: "700", maxLines: 2},
  titleMedium: {fontSize: 20, lineHeight: 26, fontWeight: "600", maxLines: 2},
  titleSmall: {fontSize: 16, lineHeight: 22, fontWeight: "600", maxLines: 2},
  body: {fontSize: 16, lineHeight: 24, fontWeight: "400", maxLines: 3},
  bodySmall: {fontSize: 14, lineHeight: 20, fontWeight: "400", maxLines: 2},
  label: {fontSize: 14, lineHeight: 20, fontWeight: "600", maxLines: 1},
  labelSmall: {fontSize: 12, lineHeight: 16, fontWeight: "600", maxLines: 1},
};

export const tvTypography: TypographyScale = {
  display: {fontSize: 48, lineHeight: 56, fontWeight: "700", maxLines: 2},
  titleLarge: {fontSize: 36, lineHeight: 44, fontWeight: "700", maxLines: 2},
  titleMedium: {fontSize: 30, lineHeight: 38, fontWeight: "600", maxLines: 2},
  titleSmall: {fontSize: 24, lineHeight: 32, fontWeight: "600", maxLines: 2},
  body: {fontSize: 24, lineHeight: 34, fontWeight: "400", maxLines: 3},
  bodySmall: {fontSize: 20, lineHeight: 28, fontWeight: "400", maxLines: 2},
  label: {fontSize: 20, lineHeight: 28, fontWeight: "600", maxLines: 1},
  labelSmall: {fontSize: 18, lineHeight: 24, fontWeight: "600", maxLines: 1},
};
