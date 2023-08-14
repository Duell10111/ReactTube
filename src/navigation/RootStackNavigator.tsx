import React from "react";
import {createNativeStackNavigator} from "@react-navigation/native-stack";
import VideoScreen from "../screens/VideoScreen";
import {Platform} from "react-native";
import SearchScreen from "../screens/SearchScreen";
import HomeWrapperScreen from "../screens/HomeWrapperScreen";
import ChannelScreen from "../screens/ChannelScreen";
import PlaylistScreen from "../screens/PlaylistScreen";
import SettingsScreen from "../screens/SettingsScreen";
import LoginScreen from "../screens/LoginScreen";
import SubscriptionScreen from "../screens/SubscriptionScreen";
import HistoryScreen from "../screens/HistoryScreen";

export type RootStackParamList = {
  Home: undefined;
  VideoScreen: {videoId: string};
  ChannelScreen: {channelId: string};
  PlaylistScreen: {playlistId: string};
  Search: undefined;
  SubscriptionScreen: undefined;
  HistoryScreen: undefined;
  SettingsScreen: undefined;
  LoginScreen: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  return (
    <Stack.Navigator screenOptions={Platform.isTV ? {headerShown: false} : {}}>
      <Stack.Screen name="Home" component={HomeWrapperScreen} />
      <Stack.Screen name="VideoScreen" component={VideoScreen} />
      <Stack.Screen name={"ChannelScreen"} component={ChannelScreen} />
      <Stack.Screen name={"PlaylistScreen"} component={PlaylistScreen} />
      <Stack.Screen name={"Search"} component={SearchScreen} />
      <Stack.Screen
        name={"SubscriptionScreen"}
        component={SubscriptionScreen}
      />
      <Stack.Screen name={"HistoryScreen"} component={HistoryScreen} />
      <Stack.Screen name={"SettingsScreen"} component={SettingsScreen} />
      <Stack.Screen name={"LoginScreen"} component={LoginScreen} />
    </Stack.Navigator>
  );
}
