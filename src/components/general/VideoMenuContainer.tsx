import React, {ReactNode} from "react";
import {StyleSheet, View} from "react-native";

interface VideoMenuContainerProps {
  children: ReactNode;
}

export function VideoMenuContainer({children}: VideoMenuContainerProps) {
  return (
    <View style={styles.container}>
      <View style={styles.touchContainer}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  touchContainer: {
    backgroundColor: "#222222",
    borderRadius: 25,
    width: "25%",
    height: "95%",
    alignSelf: "flex-end",
    marginEnd: 20,
    padding: 20,
  },
});
