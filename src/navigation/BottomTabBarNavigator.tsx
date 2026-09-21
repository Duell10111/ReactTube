import {MaterialIcons, Ionicons} from "@expo/vector-icons";
import {
  BottomTabBar,
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";
import React from "react";

import {MusicBottomPlayerBar} from "../components/music/MusicBottomPlayerBar";
import HomeScreen from "../screens/HomeScreen";
import LibraryScreen from "../screens/LibraryScreen";
import SettingsScreen from "../screens/SettingsScreen";
import SubscriptionScreen from "../screens/SubscriptionScreen";
import {DownloadScreen} from "../screens/phone/DownloadScreen";
import {MusicHomeScreen} from "../screens/phone/MusicHomeScreen";

import {useAccountContext} from "@/context/AccountContext";
import {useTranslation} from "@/localization";
import {useAppTheme} from "@/ui/theme";

export type RootBottomTabParamList = {
  HomeFeed: undefined;
  SearchScreen: undefined;
  Subscriptions: undefined;
  Library: undefined;
  MusicHomeFeed: undefined;
  Download: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootBottomTabParamList>();

export default function BottomTabBarNavigator() {
  const {loginData} = useAccountContext();
  const {t} = useTranslation();
  const {theme} = useAppTheme();
  // const [musicPlayer, setShowMusicPlayer] = useState(false)
  return (
    <>
      <Tab.Navigator
        tabBar={props => (
          <>
            <MusicBottomPlayerBar />
            <BottomTabBar {...props} />
          </>
        )}
        screenOptions={({route}) => ({
          tabBarIcon: ({focused, color, size}) => {
            let iconName: string;

            if (route.name === "HomeFeed") {
              iconName = "home";
            } else if (route.name === "Settings") {
              iconName = focused ? "list" : "list-outline";
            } else if (route.name === "Subscriptions") {
              return (
                <MaterialIcons
                  name={"subscriptions"}
                  size={size}
                  color={color}
                />
              );
            } else if (route.name === "Library") {
              iconName = "library-outline";
            } else if (route.name === "Download") {
              iconName = "download";
            } else if (route.name === "MusicHomeFeed") {
              iconName = "musical-notes";
            }

            // You can return any component that you like here!
            // @ts-ignore
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: theme.colors.brand,
          tabBarInactiveTintColor: theme.colors.textSecondary,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.divider,
          },
        })}>
        <Tab.Screen
          name={"HomeFeed"}
          component={HomeScreen}
          options={{title: t("navigation.home")}}
        />
        {loginData.accounts.length > 0 ? (
          <>
            <Tab.Screen
              name={"Subscriptions"}
              component={SubscriptionScreen}
              options={{title: t("navigation.subscriptions")}}
            />
            <Tab.Screen
              name={"Library"}
              component={LibraryScreen}
              options={{title: t("navigation.library")}}
            />
          </>
        ) : null}
        <Tab.Screen
          name={"MusicHomeFeed"}
          component={MusicHomeScreen}
          options={{title: t("navigation.music")}}
        />
        <Tab.Screen
          name={"Download"}
          component={DownloadScreen}
          options={{title: t("navigation.downloads")}}
        />
        <Tab.Screen
          name={"Settings"}
          // @ts-ignore
          component={SettingsScreen}
          options={{title: t("navigation.settings")}}
        />
      </Tab.Navigator>
    </>
  );
}
