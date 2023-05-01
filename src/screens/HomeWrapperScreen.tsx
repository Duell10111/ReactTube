import {DrawerNavigator} from "../navigation/DrawerNavigator";
import {
  Pressable,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {Icon} from "@rneui/base";
import React, {useEffect, useRef, useState} from "react";
import {DrawerActions, useNavigation} from "@react-navigation/native";
import {NativeStackProp} from "../navigation/types";
import Drawer from "../navigation/Drawer";
import DrawerContextProvider from "../navigation/DrawerContext";
import DrawerStackNavigator from "../navigation/DrawerStackNavigator";

export default function HomeWrapperScreen() {
  const navigation = useNavigation<NativeStackProp>();
  const [open, setOpen] = useState(false);

  return (
    <View style={{flexDirection: "row", flex: 1}}>
      <DrawerContextProvider onScreenFocused={() => setOpen(false)}>
        <Drawer
          open={open}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
        />
        <DrawerStackNavigator />
      </DrawerContextProvider>
    </View>
  );
}
