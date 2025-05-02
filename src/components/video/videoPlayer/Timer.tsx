import React, {ReactNode} from "react";
import {StyleSheet, Text, View} from "react-native";

import {Control} from "./Control";

interface TimerProps {
  toggleTimer: () => void;
  resetControlTimeout: () => void;
  children: ReactNode;
  showControls: boolean;
}

export const Timer = ({
  children,
  toggleTimer,
  resetControlTimeout,
  showControls,
}: TimerProps) => {
  return (
    <View style={styles.timer}>
      <Text style={styles.timerText}>{children}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  timer: {
    maxWidth: 160,
  },
  timerText: {
    backgroundColor: "transparent",
    color: "#FFF",
    fontSize: 20,
  },
});
