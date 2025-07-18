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
        style={{flex: 1}}
        onFocus={() => setFocus?.(true)}
        onBlur={() => setFocus?.(false)}
        onPress={() => onPress?.()}>
        {children}
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
});
