import React from "react";
import {Pressable, StyleSheet, View} from "react-native";

interface VideoMenuItemProps {
  children: React.ReactNode;
  setFocus?: (focus: boolean) => void;
  focus?: boolean;
  onPress?: () => void;
  selected?: boolean;
}

export function VideoMenuItem({
  children,
  setFocus,
  focus,
  selected,
  onPress,
}: VideoMenuItemProps) {
  return (
    <View
      style={[
        styles.listItemContainer,
        {
          backgroundColor:
            focus || selected
              ? "white"
              : styles.listItemContainer["backgroundColor"],
        },
      ]}>
      <Pressable
        onFocus={() => setFocus?.(true)}
        onBlur={() => setFocus?.(false)}
        onPress={() => onPress?.()}>
        <View
          style={{
            flexDirection: "row",
            marginStart: 5,
            alignItems: "center",
          }}>
          {children}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  listItemContainer: {
    backgroundColor: "#999",
    borderRadius: 15,
    marginVertical: 5,
    minHeight: 50,
  },
  imageStyle: {
    height: 50,
    aspectRatio: 1,
    borderRadius: 15,
    backgroundColor: "#555",
  },
});
