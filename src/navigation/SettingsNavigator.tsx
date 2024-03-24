import {createNativeStackNavigator} from "@react-navigation/native-stack";
import {Platform} from "react-native";

import LanguageSelectorScreen from "../components/settings/screens/LanguageSelector";
import PlayerResolutionSelectorScreen from "../components/settings/screens/PlayerResolutionSelector";
import PlayerTypeSelectorScreen from "../components/settings/screens/PlayerSelector";
import SettingsScreen from "../screens/SettingsScreen";

export type SettingsStackParamList = {
  Root: undefined;
  LanguageSelector: undefined;
  PlayerSelector: undefined;
  PlayerResolutionSelector: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: !Platform.isTV}}>
      <Stack.Screen name={"Root"} component={SettingsScreen} />
      <Stack.Screen
        name={"LanguageSelector"}
        component={LanguageSelectorScreen}
      />
      <Stack.Screen
        name={"PlayerSelector"}
        component={PlayerTypeSelectorScreen}
      />
      <Stack.Screen
        name={"PlayerResolutionSelector"}
        component={PlayerResolutionSelectorScreen}
      />
    </Stack.Navigator>
  );
}
