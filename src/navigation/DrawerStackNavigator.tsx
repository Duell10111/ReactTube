import React from "react";
import {createNativeStackNavigator} from "@react-navigation/native-stack";
import HomeScreen from "../screens/HomeScreen";

export type RootDrawerParamList = {
  HomeFeed: undefined;
  SearchScreen: undefined;
};

const DrawerStack = createNativeStackNavigator<RootDrawerParamList>();

export default function DrawerStackNavigator() {
  return (
    <DrawerStack.Navigator screenOptions={{headerShown: false}}>
      <DrawerStack.Screen name={"HomeFeed"} component={HomeScreen} />
    </DrawerStack.Navigator>
  );
}
