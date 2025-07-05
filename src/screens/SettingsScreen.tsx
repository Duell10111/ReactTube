import {CompositeScreenProps} from "@react-navigation/native";
import {NativeStackScreenProps} from "@react-navigation/native-stack";
import {Icon} from "@rneui/base";
import React, {useCallback, useEffect} from "react";
import {Platform, StyleSheet, View} from "react-native";

import SettingsItem, {
  SettingsButton,
} from "../components/settings/SettingsItem";
import SettingsSection from "../components/settings/SettingsSection";
import {parsePlayerResolution} from "../components/settings/screens/PlayerResolutionSelector";
import {parsePlayerType} from "../components/settings/screens/PlayerSelector";
import {parsePlaybackSpeed} from "../components/settings/screens/PlaybackSpeedSelector";
import {parseUiScale} from "../components/settings/screens/UiScaleSelector";
import {useAppData} from "../context/AppDataContext";
import {RootStackParamList} from "../navigation/RootStackNavigator";
import {SettingsStackParamList} from "../navigation/SettingsNavigator";
import {parseLanguage} from "../utils/YTLanguages";

import {useAccountContext} from "@/context/AccountContext";

type Props = CompositeScreenProps<
  NativeStackScreenProps<SettingsStackParamList, "Root">,
  NativeStackScreenProps<RootStackParamList, "SettingsScreen">
>;

export default function SettingsScreen({navigation}: Props) {
  const {appSettings} = useAppData();
  const {logout, clearAllData} = useAccountContext();

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

  const navigate = useCallback<(typeof navigation)["navigate"]>(
    (args: any) => {
      if (Platform.isTV) {
        return navigation.navigate(args);
      } else {
        // @ts-ignore
        return navigation.navigate("SettingsScreen", {screen: args});
      }
    },
    [navigation],
  );

  return (
    <View style={styles.containerStyle}>
      <SettingsSection sectionTitle={"General"}>
        <SettingsItem
          icon={"globe"}
          iconBackground={"#fe9400"}
          label={"Language"}
          value={parseLanguage(appSettings).label}
          onPress={() => navigate("LanguageSelector")}
        />
        <SettingsItem
          icon={"globe"}
          iconBackground={"blue"}
          label={"Video player"}
          value={parsePlayerType(appSettings).label}
          onPress={() => navigate("PlayerSelector")}
        />
        <SettingsItem
          icon={"globe"}
          iconBackground={"#f5d132"}
          label={"Video resolution variant"}
          value={parsePlayerResolution(appSettings).label}
          onPress={() => navigate("PlayerResolutionSelector")}
        />
        <SettingsItem
          icon={"globe"}
          iconBackground={"#f5d132"}
          label={"Playback speed"}
          value={parsePlaybackSpeed(appSettings).label}
          onPress={() => navigate("PlaybackSpeedSelector")}
        />
        <SettingsItem
          icon={"globe"}
          iconBackground={"#f5d132"}
          label={"UI scale"}
          value={parseUiScale(appSettings).label}
          onPress={() => navigate("UiScaleSelector")}
        />
        <SettingsItem
          icon={"globe"}
          iconBackground={"#f5d132"}
          label={"History enabled"}
          value={appSettings.trackingEnabled ? "True" : "False"}
          onPress={() => navigate("TrackingSelector")}
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
