import React, {ReactNode} from "react";
import {StyleSheet, View} from "react-native";

import {useAppTheme} from "@/ui/theme";

interface VideoMenuContainerProps {
  children: ReactNode;
}

export function VideoMenuContainer({children}: VideoMenuContainerProps) {
  const {theme} = useAppTheme();

  return (
    <View style={[styles.container, {backgroundColor: theme.colors.scrim}]}>
      <View
        style={[
          styles.touchContainer,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.divider,
            borderRadius: theme.radii.panel,
            padding: theme.spacing.xl,
          },
        ]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  touchContainer: {
    borderWidth: StyleSheet.hairlineWidth,
    width: "32%",
    minWidth: 420,
    height: "95%",
    alignSelf: "flex-end",
    marginEnd: 20,
  },
});
