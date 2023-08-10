import React from "react";
import {RootStackParamList} from "../navigation/RootStackNavigator";
import {DrawerScreenProps} from "@react-navigation/drawer";
import {StyleSheet, Text, TouchableOpacity, View} from "react-native";
import {Button, CheckBox} from "@rneui/base";
import {useAppData} from "../context/AppDataContext";
import useAccountData from "../hooks/account/useAccountData";

type Props = DrawerScreenProps<RootStackParamList, "SettingsScreen">;

export default function SettingsScreen({}: Props) {
  const {appSettings, updateSettings} = useAppData();
  const {logout, clearAllData} = useAccountData();

  return (
    <View style={styles.containerStyle}>
      <Text>Settings</Text>
      <CheckBox
        style={styles.checkBoxStyle}
        center
        title="VLC"
        checked={appSettings.vlcEnabled ?? false}
        onPress={() => {
          console.log("Press");
          updateSettings({vlcEnabled: !(appSettings.vlcEnabled ?? false)});
        }}
        Component={TouchableOpacity}
      />
      <CheckBox
        style={styles.checkBoxStyle}
        center
        title="HLS Enabled (if available)"
        checked={appSettings.hlsEnabled ?? true}
        onPress={() => {
          updateSettings({hlsEnabled: !(appSettings.hlsEnabled ?? true)});
        }}
        Component={TouchableOpacity}
      />
      <CheckBox
        style={styles.checkBoxStyle}
        center
        title="Local HLS Enabled"
        checked={appSettings.localHlsEnabled ?? false}
        onPress={() => {
          updateSettings({
            localHlsEnabled: !(appSettings.localHlsEnabled ?? false),
          });
        }}
        Component={TouchableOpacity}
      />
      <Button title={"Logout"} onPress={() => logout()} />
      <Button title={"Clear all"} onPress={() => clearAllData()} />
    </View>
  );
}

const styles = StyleSheet.create({
  containerStyle: {
    flex: 1,
  },
  checkBoxStyle: {
    flex: 1,
  },
});
