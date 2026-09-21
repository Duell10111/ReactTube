import {MaterialIcons} from "@expo/vector-icons";
import {
  BottomTabBar,
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";
import React from "react";

import {MusicBottomPlayerBar} from "../components/music/MusicBottomPlayerBar";
import HomeScreen from "../screens/HomeScreen";
import SubscriptionScreen from "../screens/SubscriptionScreen";
import {DownloadScreen} from "../screens/phone/DownloadScreen";
import {MusicHomeScreen} from "../screens/phone/MusicHomeScreen";
import YouScreen from "../screens/phone/YouScreen";

import {useTranslation} from "@/localization";
import {
  getPrimaryDestinationByRoute,
  getPrimaryDestinations,
  type PrimaryRouteName,
} from "@/ui/navigation";
import {AppHeader} from "@/ui/patterns";
import {useAppTheme} from "@/ui/theme";

export type RootBottomTabParamList = Record<PrimaryRouteName, undefined>;

const Tab = createBottomTabNavigator<RootBottomTabParamList>();

const screenComponents: Record<PrimaryRouteName, React.ComponentType<any>> = {
  HomeFeed: HomeScreen,
  Subscriptions: SubscriptionScreen,
  MusicHomeFeed: MusicHomeScreen,
  Download: DownloadScreen,
  You: YouScreen,
};

/**
 * Bottom navigation for every touch layout. Tablets keep the same bar instead
 * of a side rail, so the destinations stay in one place across devices; the
 * extra width goes into feed columns rather than into navigation chrome.
 */
export default function BottomTabBarNavigator() {
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  return (
    <Tab.Navigator
      tabBar={props => (
        <>
          <MusicBottomPlayerBar />
          <BottomTabBar {...props} />
        </>
      )}
      screenOptions={({route}) => {
        const destination = getPrimaryDestinationByRoute(route.name);

        return {
          header: ({options}) => (
            <AppHeader
              brand={route.name === "HomeFeed"}
              showAccount={route.name !== "You"}
              title={options.title ?? route.name}
            />
          ),
          tabBarIcon: ({color, size}) => (
            <MaterialIcons
              color={color}
              name={destination?.icon ?? "circle"}
              size={size}
            />
          ),
          tabBarActiveTintColor: theme.colors.brand,
          tabBarInactiveTintColor: theme.colors.textSecondary,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.divider,
          },
        };
      }}>
      {getPrimaryDestinations().map(destination => (
        <Tab.Screen
          key={destination.key}
          component={screenComponents[destination.route]}
          name={destination.route}
          options={{title: t(destination.labelKey)}}
        />
      ))}
    </Tab.Navigator>
  );
}
