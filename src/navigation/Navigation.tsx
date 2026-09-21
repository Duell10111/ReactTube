import {NavigationContainer} from "@react-navigation/native";
import React from "react";
import {SafeAreaProvider} from "react-native-safe-area-context";

import RootStackNavigator from "./RootStackNavigator";

import {navigationTheme} from "@/ui/theme";

export default function Navigation() {
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navigationTheme}>
        <RootStackNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
