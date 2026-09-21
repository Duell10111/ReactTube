import React from "react";
import {
  ScrollView,
  type ScrollViewProps,
  StyleSheet,
  View,
  type ViewProps,
} from "react-native";
import {SafeAreaView, type Edge} from "react-native-safe-area-context";

import {useAppTheme} from "@/ui/theme";

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  style?: ViewProps["style"];
  contentContainerStyle?: ScrollViewProps["contentContainerStyle"];
  testID?: string;
}

export function Screen({
  children,
  scroll = false,
  edges = ["top", "right", "bottom", "left"],
  style,
  contentContainerStyle,
  testID,
}: ScreenProps) {
  const {theme} = useAppTheme();

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.safeArea, {backgroundColor: theme.colors.background}]}
      testID={testID}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentContainerStyle]}
          style={style}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
});
