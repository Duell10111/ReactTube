import React, {ReactNode} from "react";
import {StyleSheet, View} from "react-native";

import {AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

interface TimerProps {
  toggleTimer: () => void;
  resetControlTimeout: () => void;
  children: ReactNode;
  showControls: boolean;
}

export const Timer = ({children}: TimerProps) => {
  const {theme} = useAppTheme();

  return (
    <View style={[styles.timer, {paddingHorizontal: theme.spacing.xl}]}>
      <AppText variant={"label"}>{children}</AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  timer: {
    alignSelf: "flex-start",
  },
});
