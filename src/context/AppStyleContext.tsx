import React from "react";

import {ThemeProvider, useAppTheme} from "@/ui/theme";

type StyleType = "dark";

interface AppStyle {
  textColor: string;
  invertedTextColor: string;
  backgroundColor: string;
  backgroundColorAlpha: string;
}

interface AppStyleContext {
  type: StyleType;
  style: AppStyle;
}

interface Props {
  children?: React.ReactNode;
}

export default function AppStyleProvider({children}: Props) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

export function useAppStyle(): AppStyleContext {
  const {theme} = useAppTheme();

  return {
    type: theme.name,
    style: {
      textColor: theme.colors.textPrimary,
      invertedTextColor: theme.colors.background,
      backgroundColor: theme.colors.background,
      backgroundColorAlpha: theme.colors.scrim,
    },
  };
}
