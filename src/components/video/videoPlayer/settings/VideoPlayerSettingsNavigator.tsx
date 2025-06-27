import {usePreventRemove} from "@react-navigation/native";
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";

import {VideoPlayerSpeed} from "@/components/video/videoPlayer/settings/VideoPlayerSpeed";

export type VideoPlayerSettingsNavigatorParamList = {
  Root: undefined;
  PlayerSpeed: undefined;
};

export type VideoPlayerSettingsNavigatorParam =
  NativeStackNavigationProp<VideoPlayerSettingsNavigatorParamList>;

const Stack =
  createNativeStackNavigator<VideoPlayerSettingsNavigatorParamList>();

export function VideoPlayerSettingsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        presentation: "transparentModal",
        contentStyle: {backgroundColor: "transparent"},
      }}>
      <Stack.Screen name={"PlayerSpeed"} component={VideoPlayerSpeed} />
    </Stack.Navigator>
  );
}
