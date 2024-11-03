import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import React, {useRef} from "react";
import {SafeAreaProvider} from "react-native-safe-area-context";

import RootStackNavigator from "./RootStackNavigator";

import {useAppStyle} from "@/context/AppStyleContext";
import {navigationIntegration} from "@/utils/Sentry";

export default function Navigation() {
  const {type} = useAppStyle();
  const containerRef = useRef(null);

  return (
    <SafeAreaProvider>
      <NavigationContainer
        ref={containerRef}
        theme={type === "dark" ? DarkTheme : DefaultTheme}
        onReady={() => {
          navigationIntegration.registerNavigationContainer(containerRef);
        }}>
        <RootStackNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
