import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";
import React from "react";
import {Platform} from "react-native";

import SettingsNavigator from "./SettingsNavigator";
import useAppInit from "../hooks/general/useAppInit";
import ChannelScreen from "../screens/ChannelScreen";
import HistoryScreen from "../screens/HistoryScreen";
import HomeWrapperScreen from "../screens/HomeWrapperScreen";
import LoadingScreen from "../screens/LoadingScreen";
import LoginScreen from "../screens/LoginScreen";
import PlaylistScreen from "../screens/PlaylistScreen";
import SearchScreen from "../screens/SearchScreen";
import SubscriptionScreen from "../screens/SubscriptionScreen";
import VideoScreen from "../screens/VideoScreen";
import {ActiveDownloadScreen} from "../screens/phone/ActiveDownloadScreen";
import {DownloadPlayer} from "../screens/phone/DownloadPlayer";
import {MusicPlayerScreen} from "../screens/phone/MusicPlayerScreen";
import {MusicPlaylistScreen} from "../screens/phone/MusicPlaylistScreen";
import {MusicSearchScreen} from "../screens/phone/MusicSearchScreen";
import VideoScreenWrapper from "../screens/phone/VideoScreenWrapper";
import {YTNodes} from "../utils/Youtube";

import TrendingScreen from "@/screens/TrendingScreen";
import {MusicAlbumScreen} from "@/screens/phone/MusicAlbumScreen";
import {MusicChannelScreen} from "@/screens/phone/MusicChannelScreen";
import {MusicLibraryScreen} from "@/screens/phone/MusicLibraryScreen";

export type RootStackParamList = {
  LoadingScreen: undefined;
  Home: undefined;
  Trending: undefined;
  VideoScreen: {
    videoId: string;
    navEndpoint?: YTNodes.NavigationEndpoint;
    reel?: boolean;
  };
  ChannelScreen: {channelId: string};
  PlaylistScreen: {playlistId: string};
  Search: undefined;
  SubscriptionScreen: undefined;
  HistoryScreen: undefined;
  SettingsScreen: undefined;
  LoginScreen: undefined;
  // Downloads
  ActiveDownloadScreen: undefined;
  DownloadPlayer: {id: string};
  // Music Screens
  MusicPlaylistScreen: {playlistId: string};
  MusicChannelScreen: {artistId: string};
  MusicAlbumScreen: {albumId: string};
  MusicSearchScreen: undefined;
  MusicLibraryScreen: undefined;
  MusicPlayerScreen: {
    videoId: string;
    navEndpoint?: YTNodes.NavigationEndpoint;
  };
};

export type RootNavProp = NativeStackNavigationProp<RootStackParamList>;

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const {init} = useAppInit();

  return (
    <Stack.Navigator screenOptions={Platform.isTV ? {headerShown: false} : {}}>
      {!init ? (
        <Stack.Screen
          name={"LoadingScreen"}
          component={LoadingScreen}
          options={{headerShown: false}}
        />
      ) : (
        <>
          <Stack.Screen
            name={"Home"}
            component={HomeWrapperScreen}
            options={!Platform.isTV ? {headerShown: false} : undefined}
          />
          <Stack.Screen
            name={"Trending"}
            component={TrendingScreen}
            options={!Platform.isTV ? {headerShown: false} : undefined}
          />
          <Stack.Screen
            name={"VideoScreen"}
            component={Platform.isTV ? VideoScreen : VideoScreenWrapper}
            options={{title: "Video"}}
          />
          <Stack.Screen
            name={"ChannelScreen"}
            component={ChannelScreen}
            options={{title: "Channel"}}
          />
          <Stack.Screen
            name={"PlaylistScreen"}
            component={PlaylistScreen}
            options={{title: "Playlist"}}
          />
          <Stack.Screen name={"Search"} component={SearchScreen} />
          {/*<Stack.Screen*/}
          {/*  name={"SubscriptionScreen"}*/}
          {/*  component={SubscriptionScreen}*/}
          {/*/>*/}
          {/*<Stack.Screen name={"HistoryScreen"} component={HistoryScreen} />*/}
          <Stack.Screen
            name={"SettingsScreen"}
            component={SettingsNavigator}
            // Hotfix for ugly title set title per Screen manually on Phones/Tablets?
            options={{headerTitle: "Settings"}}
          />
          <Stack.Screen name={"LoginScreen"} component={LoginScreen} />
          {/* Download Screens*/}
          <Stack.Screen
            name={"ActiveDownloadScreen"}
            component={ActiveDownloadScreen}
            options={{headerTitle: "Active Downloads"}}
          />
          <Stack.Screen
            name={"DownloadPlayer"}
            component={DownloadPlayer}
            options={{headerTitle: "Download Player"}}
          />
          {/* Music Screens*/}
          <Stack.Screen
            name={"MusicLibraryScreen"}
            component={MusicLibraryScreen}
            options={{title: "Music Library"}}
          />
          <Stack.Screen
            name={"MusicSearchScreen"}
            component={MusicSearchScreen}
            options={{title: "Music Search"}}
          />
          <Stack.Screen
            name={"MusicPlaylistScreen"}
            component={MusicPlaylistScreen}
            options={{title: "Music Playlist"}}
          />
          <Stack.Screen
            name={"MusicChannelScreen"}
            component={MusicChannelScreen}
            options={{title: "Music Channel"}}
          />
          <Stack.Screen
            name={"MusicAlbumScreen"}
            component={MusicAlbumScreen}
            options={{title: "Music Channel"}}
          />
          <Stack.Screen
            name={"MusicPlayerScreen"}
            component={MusicPlayerScreen}
            options={{
              title: "Music Player",
              // Use #222222dd for transparent in the future
              contentStyle: {backgroundColor: "#222222"},
              headerStyle: {backgroundColor: "#222222"},
              // presentation: "formSheet",
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
