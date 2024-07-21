import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import React from "react";
import {SafeAreaProvider} from "react-native-safe-area-context";

import RootStackNavigator from "./RootStackNavigator";
import {useAppStyle} from "../context/AppStyleContext";

export default function Navigation() {
  const {type} = useAppStyle();

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={type === "dark" ? DarkTheme : DefaultTheme}>
        <RootStackNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
