import {createNativeStackNavigator} from "@react-navigation/native-stack";
import React from "react";

import HomeScreen from "../screens/HomeScreen";
import LibraryScreen from "../screens/LibraryScreen";

import {MyYoutubeScreenTV} from "@/screens/MyYoutubeScreenTV";
import SubscriptionScreen from "@/screens/SubscriptionScreen";
import TrendingScreen from "@/screens/TrendingScreen";
import HistoryScreen from "@/screens/tv/HistoryScreen";
import {PlaylistsScreen} from "@/screens/tv/PlaylistsScreen";

export type RootDrawerParamList = {
  HomeFeed: undefined;
  TrendingScreen: undefined;
  SubscriptionScreen: undefined;
  SearchScreen: undefined;
  LibraryScreen: undefined;
  HistoryScreen: undefined;
  PlaylistsScreen: undefined;
  MyYoutubeScreen: undefined;
};

const DrawerStack = createNativeStackNavigator<RootDrawerParamList>();

export default function DrawerStackNavigator() {
  return (
    <DrawerStack.Navigator screenOptions={{headerShown: false}}>
      <DrawerStack.Screen name={"HomeFeed"} component={HomeScreen} />
      <DrawerStack.Screen name={"TrendingScreen"} component={TrendingScreen} />
      <DrawerStack.Screen
        name={"SubscriptionScreen"}
        component={SubscriptionScreen}
      />
      <DrawerStack.Screen name={"LibraryScreen"} component={LibraryScreen} />
      <DrawerStack.Screen name={"HistoryScreen"} component={HistoryScreen} />
      <DrawerStack.Screen
        name={"MyYoutubeScreen"}
        component={MyYoutubeScreenTV}
      />
      <DrawerStack.Screen
        name={"PlaylistsScreen"}
        component={PlaylistsScreen}
      />
    </DrawerStack.Navigator>
  );
}
