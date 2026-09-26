import React from "react";
import {ActivityIndicator, StyleSheet, View} from "react-native";

import {useTranslation} from "@/localization";
import {useAppTheme} from "@/ui/theme";

export default function LoadingComponent() {
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {justifyContent: "center", alignItems: "center"},
      ]}>
      <ActivityIndicator
        accessibilityLabel={t("common.loading")}
        color={theme.colors.textSecondary}
        size={"large"}
      />
    </View>
  );
}
