import React from "react";
import {createNativeStackNavigator} from "@react-navigation/native-stack";
import HomeScreen from "../screens/HomeScreen";
import VideoScreen from "../screens/VideoScreen";
import {Platform} from "react-native";
import SearchScreen from "../screens/SearchScreen";
import HomeWrapperScreen from "../screens/HomeWrapperScreen";
import ChannelScreen from "../screens/ChannelScreen";

export type RootStackParamList = {
  Home: undefined;
  VideoScreen: {videoId: string};
  ChannelScreen: {channelId: string};
  Search: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  return (
    <Stack.Navigator screenOptions={Platform.isTV ? {headerShown: false} : {}}>
      <Stack.Screen name="Home" component={HomeWrapperScreen} />
      <Stack.Screen
        name="VideoScreen"
        component={VideoScreen}
        // initialParams={{videoId: "iasbPFjuQZU"}}
      />
      <Stack.Screen name={"ChannelScreen"} component={ChannelScreen} />
      <Stack.Screen name={"Search"} component={SearchScreen} />
    </Stack.Navigator>
  );
}
