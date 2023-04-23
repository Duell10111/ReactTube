import React from "react";
import {RootStackParamList} from "../navigation/RootStackNavigator";
import {DrawerScreenProps} from "@react-navigation/drawer";
import {Text, TouchableOpacity, View} from "react-native";
import {CheckBox} from "@rneui/base";
import {useAppData} from "../context/AppDataContext";

type Props = DrawerScreenProps<RootStackParamList, "SettingsScreen">;

export default function SettingsScreen(props: Props) {
  const {appSettings, updateSettings} = useAppData();

  return (
    <View style={{backgroundColor: "red", flex: 1}}>
      <Text>Settings</Text>
      <CheckBox
        style={{flex: 1}}
        center
        title="VLC"
        checked={appSettings.vlcEnabled ?? false}
        onPress={() => {
          console.log("Press");
          updateSettings({vlcEnabled: !(appSettings.vlcEnabled ?? false)});
        }}
        Component={TouchableOpacity}
      />
    </View>
  );
}
