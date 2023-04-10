import React from "react";
import {createNativeStackNavigator} from "@react-navigation/native-stack";
import HomeScreen from "../screens/HomeScreen";
import VideoScreen from "../screens/VideoScreen";
import {Platform} from "react-native";

export type RootStackParamList = {
  Home: undefined;
  VideoScreen: {videoId: string};
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  return (
    <Stack.Navigator screenOptions={Platform.isTV ? {headerShown: false} : {}}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen
        name="VideoScreen"
        component={VideoScreen}
        // initialParams={{videoId: "iasbPFjuQZU"}}
      />
    </Stack.Navigator>
  );
}
