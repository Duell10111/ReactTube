import {createMaterialTopTabNavigator} from "@react-navigation/material-top-tabs";

import {ChannelTabPhone} from "@/components/channel/phone/ChannelTabPhone";
import {YTChannelTabType} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import {useAppTheme} from "@/ui/theme";

export type RootChannelTabParamList = {
  Home: undefined;
  Videos: undefined;
  Playlists: undefined;
  Shorts: undefined;
  About: undefined;
};

const Tab = createMaterialTopTabNavigator<RootChannelTabParamList>();

interface ChannelTabsProps {
  channelTypes: YTChannelTabType[];
}

export function ChannelTabs({channelTypes}: ChannelTabsProps) {
  const {t} = useTranslation();
  const {theme} = useAppTheme();
  const labels: Record<YTChannelTabType, string> = {
    Home: t("channel.tab.home"),
    Videos: t("channel.tab.videos"),
    Shorts: t("channel.tab.shorts"),
    Playlists: t("channel.tab.playlists"),
    About: t("channel.tab.about"),
  };

  return (
    <Tab.Navigator
      screenOptions={{
        sceneStyle: {backgroundColor: theme.colors.background},
        tabBarActiveTintColor: theme.colors.textPrimary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarIndicatorStyle: {backgroundColor: theme.colors.brand},
        tabBarStyle: {backgroundColor: theme.colors.surface},
      }}>
      {channelTypes.map((channel: YTChannelTabType) => (
        <Tab.Screen
          key={channel}
          name={channel}
          component={ChannelTabPhone}
          options={{title: labels[channel]}}
        />
      ))}
    </Tab.Navigator>
  );
}
