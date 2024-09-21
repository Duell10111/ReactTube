import {createNativeStackNavigator} from "@react-navigation/native-stack";

import LanguageSelectorScreen from "../components/settings/screens/LanguageSelector";
import PlayerResolutionSelectorScreen from "../components/settings/screens/PlayerResolutionSelector";
import PlayerTypeSelectorScreen from "../components/settings/screens/PlayerSelector";
import SettingsScreen from "../screens/SettingsScreen";

import TrackingSelector from "@/components/settings/screens/TrackingSelector";

export type SettingsStackParamList = {
  Root: undefined;
  LanguageSelector: undefined;
  PlayerSelector: undefined;
  PlayerResolutionSelector: undefined;
  TrackingSelector: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export default function SettingsNavigator() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
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
      <Stack.Screen name={"TrackingSelector"} component={TrackingSelector} />
    </Stack.Navigator>
  );
}
