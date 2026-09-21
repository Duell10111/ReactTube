import React from "react";
import {Platform} from "react-native";

import BottomTabBarNavigator from "@/navigation/BottomTabBarNavigator";
import DrawerStackNavigator from "@/navigation/DrawerStackNavigator";
import {TVNavigationRailShell} from "@/navigation/tv/TVNavigationRailShell";

export default function HomeWrapperScreen() {
  if (Platform.isTV) {
    return <TVVariant />;
  } else {
    return <DeviceVariant />;
  }
}

function TVVariant() {
  return (
    <TVNavigationRailShell>
      <DrawerStackNavigator />
    </TVNavigationRailShell>
  );
}

function DeviceVariant() {
  return <BottomTabBarNavigator />;
}
