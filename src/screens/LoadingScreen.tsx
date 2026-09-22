import {Image} from "expo-image";
import React from "react";
import {Platform, StyleSheet, View} from "react-native";

import {AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

export default function LoadingScreen() {
  const {theme} = useAppTheme();

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <Image
        style={[styles.logo, Platform.isTV ? styles.logoTV : undefined]}
        source={require("../../assets/icon-512-maskable.png")}
      />
      <AppText
        style={[styles.text, Platform.isTV ? styles.textTV : undefined]}
        variant={Platform.isTV ? "display" : "titleLarge"}>
        {"ReactTube"}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    borderRadius: 25,
    width: 200,
    height: 200,
  },
  logoTV: {
    height: 400,
    width: 400,
  },
  text: {
    marginTop: 10,
  },
  textTV: {
    marginTop: 20,
  },
});
