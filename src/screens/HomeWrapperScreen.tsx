import {DrawerNavigator} from "../navigation/DrawerNavigator";
import {Pressable, TouchableOpacity, View} from "react-native";
import {Icon} from "@rneui/base";
import React from "react";
import {DrawerActions, useNavigation} from "@react-navigation/native";
import {NativeStackProp} from "../navigation/types";

export default function HomeWrapperScreen() {
  const navigation = useNavigation<NativeStackProp>();

  return (
    <View style={{flexDirection: "row", backgroundColor: "blue", flex: 1}}>
      <Pressable
        style={{width: 1, height: "100%", backgroundColor: "blue"}}
        onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
        onFocus={() => navigation.dispatch(DrawerActions.toggleDrawer())}
        focusable={false}
      />
      <DrawerNavigator />
    </View>
  );
}
