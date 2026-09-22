import React from "react";
import {StyleProp, StyleSheet, View, ViewStyle} from "react-native";

import {AppText} from "@/ui/components";
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
      <AppText
        color={"textSecondary"}
        style={styles.sectionTitle}
        variant={"labelSmall"}>
        {sectionTitle}
      </AppText>
      <View
        style={[
          styles.sectionBody,
          {backgroundColor: theme.colors.surface, gap: theme.spacing.xs},
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
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  sectionBody: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
