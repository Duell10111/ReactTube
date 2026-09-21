import React from "react";
import {StyleProp, StyleSheet, Text, View, ViewStyle} from "react-native";

import {useAppTheme} from "@/ui/theme";

interface Props {
  children?: React.ReactNode;
  sectionTitle?: string;
  style?: StyleProp<ViewStyle>;
}

export default function SettingsSection({
  children,
  style,
  sectionTitle,
}: Props) {
  const {theme} = useAppTheme();

  return (
    <View style={[styles.section, style]}>
      <Text style={[styles.sectionTitle, {color: theme.colors.textSecondary}]}>
        {sectionTitle}
      </Text>
      <View
        style={[
          styles.sectionBody,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.divider,
          },
        ]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingTop: 12,
  },
  sectionTitle: {
    marginVertical: 8,
    marginHorizontal: 24,
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  sectionBody: {
    paddingLeft: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
