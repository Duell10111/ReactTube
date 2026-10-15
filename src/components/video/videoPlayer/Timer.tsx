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
      {/* The bottom vignette is too faint to keep light text readable over
       * bright frames, so the time sits on its own scrim. */}
      <View
        style={{
          backgroundColor: theme.colors.scrim,
          borderRadius: theme.radii.control,
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.xs,
        }}>
        <AppText variant={"label"} style={styles.text}>
          {children}
        </AppText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  timer: {
    alignSelf: "flex-start",
  },
  text: {
    fontVariant: ["tabular-nums"],
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowRadius: 3,
  },
});
