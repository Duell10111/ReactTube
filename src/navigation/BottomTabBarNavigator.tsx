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
          tabBarActiveTintColor: "tomato",
          tabBarInactiveTintColor: "gray",
        })}>
        <Tab.Screen
          name={"HomeFeed"}
          component={HomeScreen}
          options={{title: "Home"}}
        />
        {loginData.accounts.length > 0 ? (
          <>
            <Tab.Screen name={"Subscriptions"} component={SubscriptionScreen} />
            <Tab.Screen name={"Library"} component={LibraryScreen} />
          </>
        ) : null}
        <Tab.Screen
          name={"MusicHomeFeed"}
          component={MusicHomeScreen}
          options={{title: "Music"}}
        />
        <Tab.Screen
          name={"Download"}
          component={DownloadScreen}
          options={{title: "Downloads"}}
        />
        <Tab.Screen
          name={"Settings"}
          // @ts-ignore
          component={SettingsScreen}
        />
      </Tab.Navigator>
    </>
  );
}
