import React from "react";
import {StyleSheet, View} from "react-native";

import {useAppTheme} from "@/ui/theme";

interface Props {
  children: React.ReactNode;
}

export default function BackgroundWrapper({children}: Props) {
  const {theme} = useAppTheme();

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {backgroundColor: theme.colors.background},
      ]}>
      {children}
    </View>
  );
}
