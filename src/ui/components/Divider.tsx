import React from "react";
import {StyleSheet, View, type ViewProps} from "react-native";

import {useAppTheme} from "@/ui/theme";

export function Divider({style, ...props}: ViewProps) {
  const {theme} = useAppTheme();

  return (
    <View
      accessibilityElementsHidden
      style={[styles.divider, {backgroundColor: theme.colors.divider}, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
  },
});
