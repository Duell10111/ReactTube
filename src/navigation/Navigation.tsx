import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import React from "react";

import RootStackNavigator from "./RootStackNavigator";
import {useAppStyle} from "../context/AppStyleContext";

export default function Navigation() {
  const {type} = useAppStyle();

  return (
    <NavigationContainer theme={type === "dark" ? DarkTheme : DefaultTheme}>
      <RootStackNavigator />
    </NavigationContainer>
  );
}
