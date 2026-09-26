import React from "react";
import {Text, type TextProps, type TextStyle} from "react-native";

import {type AppColors, type TypographyRole, useAppTheme} from "@/ui/theme";

export type TextColorRole = Extract<
  keyof AppColors,
  "textPrimary" | "textSecondary" | "textDisabled" | "error" | "success"
>;

interface AppTextProps extends TextProps {
  variant?: TypographyRole;
  color?: TextColorRole;
  align?: TextStyle["textAlign"];
}

export function AppText({
  variant = "body",
  color = "textPrimary",
  align,
  numberOfLines,
  style,
  ...props
}: AppTextProps) {
  const {theme} = useAppTheme();
  const typography = theme.typography[variant];

  return (
    <Text
      allowFontScaling
      numberOfLines={numberOfLines ?? typography.maxLines}
      style={[
        {
          color: theme.colors[color],
          fontSize: typography.fontSize,
          lineHeight: typography.lineHeight,
          fontWeight: typography.fontWeight,
          textAlign: align,
        },
        style,
      ]}
      {...props}
    />
  );
}
