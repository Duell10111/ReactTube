import {DrawerNavigator} from "../navigation/DrawerNavigator";
import {TouchableOpacity, View} from "react-native";
import {Icon} from "@rneui/base";
import React from "react";
import {DrawerActions, useNavigation} from "@react-navigation/native";
import {NativeStackProp} from "../navigation/types";

export default function HomeWrapperScreen() {
  const navigation = useNavigation<NativeStackProp>();

  return (
    <>
      <TouchableOpacity
        onPress={() => navigation.navigate("Search")}
        // onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
      >
        <Icon name={"search"} type={"material"} raised />
      </TouchableOpacity>
      <DrawerNavigator />
    </>
  );
}
