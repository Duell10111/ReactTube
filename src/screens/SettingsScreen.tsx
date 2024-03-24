import {CompositeScreenProps} from "@react-navigation/native";
import {NativeStackScreenProps} from "@react-navigation/native-stack";
import {CheckBox, Icon} from "@rneui/base";
import React, {useEffect} from "react";
import {Platform, StyleSheet, Text, TouchableOpacity, View} from "react-native";

import SettingsItem, {
  SettingsButton,
} from "../components/settings/SettingsItem";
import SettingsSection from "../components/settings/SettingsSection";
import {parseLanguage} from "../components/settings/screens/LanguageSelector";
import {parsePlayerResolution} from "../components/settings/screens/PlayerResolutionSelector";
import {parsePlayerType} from "../components/settings/screens/PlayerSelector";
import {useAppData} from "../context/AppDataContext";
import useAccountData from "../hooks/account/useAccountData";
import {RootStackParamList} from "../navigation/RootStackNavigator";
import {SettingsStackParamList} from "../navigation/SettingsNavigator";

type Props = CompositeScreenProps<
  NativeStackScreenProps<SettingsStackParamList, "Root">,
  NativeStackScreenProps<RootStackParamList, "SettingsScreen">
>;

export default function SettingsScreen({navigation}: Props) {
  const {appSettings, updateSettings} = useAppData();
  const {logout, clearAllData} = useAccountData();

  useEffect(() => {
    if (!Platform.isTV) {
      navigation.setOptions({
        headerRight: () => (
          <Icon
            name={"login"}
            onPress={() => navigation.navigate("LoginScreen")}
            color={"white"}
            style={{marginEnd: 10}}
          />
        ),
      });
    }
  }, [navigation]);

  return (
    <View style={styles.containerStyle}>
      <Text>{"Settings"}</Text>
      <CheckBox
        style={styles.checkBoxStyle}
        center
        title={"VLC"}
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
        title={"HLS Enabled (if available)"}
        checked={appSettings.hlsEnabled ?? true}
        onPress={() => {
          updateSettings({hlsEnabled: !(appSettings.hlsEnabled ?? true)});
        }}
        Component={TouchableOpacity}
      />
      <CheckBox
        style={styles.checkBoxStyle}
        center
        title={"Local HLS Enabled"}
        checked={appSettings.localHlsEnabled ?? false}
        onPress={() => {
          updateSettings({
            localHlsEnabled: !(appSettings.localHlsEnabled ?? false),
          });
        }}
        Component={TouchableOpacity}
      />
      <SettingsSection>
        <SettingsItem
          icon={"globe"}
          iconBackground={"#fe9400"}
          label={"Language"}
          value={parseLanguage(appSettings).label}
          onPress={() => navigation.navigate("LanguageSelector")}
        />
        <SettingsItem
          icon={"globe"}
          iconBackground={"blue"}
          label={"Video player"}
          value={parsePlayerType(appSettings).label}
          onPress={() => navigation.navigate("PlayerSelector")}
        />
        <SettingsItem
          icon={"globe"}
          iconBackground={"#f5d132"}
          label={"Video resolution variant"}
          value={parsePlayerResolution(appSettings).label}
          onPress={() => navigation.navigate("PlayerResolutionSelector")}
        />
        <SettingsButton label={"Clear all"} onPress={() => clearAllData()} />
        <SettingsButton label={"Logout"} onPress={() => logout()} />
      </SettingsSection>
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
