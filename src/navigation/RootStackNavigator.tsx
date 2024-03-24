import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";
import React from "react";
import {Platform} from "react-native";

import SettingsNavigator from "./SettingsNavigator";
import useAppInit from "../hooks/general/useAppInit";
import ChannelScreen from "../screens/ChannelScreen";
import HistoryScreen from "../screens/HistoryScreen";
import HomeWrapperScreen from "../screens/HomeWrapperScreen";
import LoadingScreen from "../screens/LoadingScreen";
import LoginScreen from "../screens/LoginScreen";
import PlaylistScreen from "../screens/PlaylistScreen";
import SearchScreen from "../screens/SearchScreen";
import SubscriptionScreen from "../screens/SubscriptionScreen";
import VideoScreen from "../screens/VideoScreen";
import VideoScreenWrapper from "../screens/phone/VideoScreenWrapper";
import {YTNodes} from "../utils/Youtube";

export type RootStackParamList = {
  LoadingScreen: undefined;
  Home: undefined;
  VideoScreen: {
    videoId: string;
    navEndpoint?: YTNodes.NavigationEndpoint;
    reel?: boolean;
  };
  ChannelScreen: {channelId: string};
  PlaylistScreen: {playlistId: string};
  Search: undefined;
  SubscriptionScreen: undefined;
  HistoryScreen: undefined;
  SettingsScreen: undefined;
  LoginScreen: undefined;
};

export type RootNavProp = NativeStackNavigationProp<RootStackParamList>;

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const {init} = useAppInit();

  return (
    <Stack.Navigator screenOptions={Platform.isTV ? {headerShown: false} : {}}>
      {!init ? (
        <Stack.Screen
          name={"LoadingScreen"}
          component={LoadingScreen}
          options={{headerShown: false}}
        />
      ) : (
        <>
          <Stack.Screen
            name={"Home"}
            component={HomeWrapperScreen}
            options={!Platform.isTV ? {headerShown: false} : undefined}
          />
          <Stack.Screen
            name={"VideoScreen"}
            component={Platform.isTV ? VideoScreen : VideoScreenWrapper}
            options={{title: "Video"}}
          />
          <Stack.Screen
            name={"ChannelScreen"}
            component={ChannelScreen}
            options={{title: "Channel"}}
          />
          <Stack.Screen
            name={"PlaylistScreen"}
            component={PlaylistScreen}
            options={{title: "Playlist"}}
          />
          <Stack.Screen name={"Search"} component={SearchScreen} />
          <Stack.Screen
            name={"SubscriptionScreen"}
            component={SubscriptionScreen}
          />
          <Stack.Screen name={"HistoryScreen"} component={HistoryScreen} />
          <Stack.Screen name={"SettingsScreen"} component={SettingsNavigator} />
          <Stack.Screen name={"LoginScreen"} component={LoginScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
