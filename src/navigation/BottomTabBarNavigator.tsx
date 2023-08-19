import React from "react";
import {createBottomTabNavigator} from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";
import HomeScreen from "../screens/HomeScreen";
import SettingsScreen from "../screens/SettingsScreen";
import SearchScreen from "../screens/SearchScreen";

export type RootBottomTabParamList = {
  HomeFeed: undefined;
  SearchScreen: undefined;
  Subscriptions: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootBottomTabParamList>();

export default function BottomTabBarNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          let iconName;

          if (route.name === "HomeFeed") {
            iconName = "home";
          } else if (route.name === "Settings") {
            iconName = focused ? "ios-list" : "ios-list-outline";
          }

          // You can return any component that you like here!
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "tomato",
        tabBarInactiveTintColor: "gray",
      })}>
      <Tab.Screen name="HomeFeed" component={HomeScreen} />
      <Tab.Screen name="SearchScreen" component={SearchScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
