import React from "react";
import {StyleSheet, View} from "react-native";

import ShelfVideoSelectorProvider from "../../../context/ShelfVideoSelector";

import {useAppTheme} from "@/ui/theme";

interface Props {
  children: React.ReactNode;
  onFocus?: () => void;
}

export default function BottomContainer({children, onFocus}: Props) {
  const {theme} = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background,
          paddingTop: theme.spacing.sm,
        },
      ]}>
      <ShelfVideoSelectorProvider onElementFocused={onFocus}>
        {children}
      </ShelfVideoSelectorProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: "100%", // TODO: Adapt for playlist scrollview
  },
});
