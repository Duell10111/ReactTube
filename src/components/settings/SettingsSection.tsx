import React from "react";
import {StyleProp, StyleSheet, Text, View, ViewStyle} from "react-native";
import {useAppData} from "@/context/AppDataContext";

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
  const {appSettings} = useAppData();
  const scale = appSettings.uiScale ?? 1;
  return (
    <View style={[styles.section, style]}>
      <Text style={[styles.sectionTitle, {fontSize: 14 * scale}]}>
        {sectionTitle}
      </Text>
      <View style={styles.sectionBody}>{children}</View>
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
    color: "#a7a7a7",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  sectionBody: {
    paddingLeft: 24,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e3e3e3",
  },
});
