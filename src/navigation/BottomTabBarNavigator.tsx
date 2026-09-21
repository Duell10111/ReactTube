import {MaterialIcons} from "@expo/vector-icons";
import {
  BottomTabBar,
  createBottomTabNavigator,
} from "@react-navigation/bottom-tabs";
import React from "react";
import {StyleSheet, View} from "react-native";

import {MusicBottomPlayerBar} from "../components/music/MusicBottomPlayerBar";
import HomeScreen from "../screens/HomeScreen";
import SubscriptionScreen from "../screens/SubscriptionScreen";
import {DownloadScreen} from "../screens/phone/DownloadScreen";
import {MusicHomeScreen} from "../screens/phone/MusicHomeScreen";
import YouScreen from "../screens/phone/YouScreen";

import {useTranslation} from "@/localization";
import {useAppChrome} from "@/ui/layout";
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

export default function BottomTabBarNavigator() {
  const {t} = useTranslation();
  const {theme} = useAppTheme();
  const chrome = useAppChrome();
  const railMode = chrome.navigationMode === "navigationRail";

  return (
    <View style={styles.container}>
      <Tab.Navigator
        tabBar={props =>
          railMode ? (
            <BottomTabBar {...props} />
          ) : (
            <>
              <MusicBottomPlayerBar />
              <BottomTabBar {...props} />
            </>
          )
        }
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
            tabBarPosition: railMode ? "left" : "bottom",
            tabBarVariant: railMode ? "material" : "uikit",
            tabBarStyle: railMode
              ? {
                  width: chrome.railWidth,
                  backgroundColor: theme.colors.surface,
                  borderRightColor: theme.colors.divider,
                }
              : {
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
      {railMode && chrome.miniPlayerVisible ? (
        <View
          style={[
            styles.miniPlayer,
            {
              bottom: chrome.miniPlayerOffset.bottom,
              left: chrome.miniPlayerOffset.left,
              right: chrome.miniPlayerOffset.right,
            },
          ]}>
          <MusicBottomPlayerBar />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  miniPlayer: {
    position: "absolute",
  },
});
