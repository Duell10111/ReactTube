import {NavigationContainer} from "@react-navigation/native";
import React from "react";
import {SafeAreaProvider} from "react-native-safe-area-context";

import RootStackNavigator from "./RootStackNavigator";

import {PlaylistManagerContext} from "@/context/PlaylistManagerContext";
import {navigationTheme} from "@/ui/theme";

export default function Navigation() {
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navigationTheme}>
        {/*
         * Inside the container on purpose: the manager renders its bottom sheet
         * next to the navigator, and the playlist rows in it are media rows that
         * navigate. Above the container they had no navigation object and saving
         * a video crashed.
         */}
        <PlaylistManagerContext>
          <RootStackNavigator />
        </PlaylistManagerContext>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
