import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";
import React from "react";
import {Platform} from "react-native";

import SettingsNavigator from "./SettingsNavigator";

import {VideoMenuScreen} from "@/components/general/VideoMenu";
import {PlaylistManagerContextMenu} from "@/components/playlists/tv/PlaylistManagerContextMenu";
import {HistoryScreen} from "@/components/screens/phone/HistoryScreen";
import {VideoPlayerLanguage} from "@/components/video/videoPlayer/settings/VideoPlayerLanguage";
import {VideoPlayerSettings} from "@/components/video/videoPlayer/settings/VideoPlayerSettings";
import {VideoPlayerSpeed} from "@/components/video/videoPlayer/settings/VideoPlayerSpeed";
import {ElementData} from "@/extraction/Types";
import useAppInit from "@/hooks/general/useAppInit";
import ChannelScreen from "@/screens/ChannelScreen";
import HomeWrapperScreen from "@/screens/HomeWrapperScreen";
import LoadingScreen from "@/screens/LoadingScreen";
import LoginScreen from "@/screens/LoginScreen";
import PlaylistScreen from "@/screens/PlaylistScreen";
import SearchScreen from "@/screens/SearchScreen";
import TrendingScreen from "@/screens/TrendingScreen";
import VideoScreen from "@/screens/VideoScreen";
import {ActiveDownloadScreen} from "@/screens/phone/ActiveDownloadScreen";
import {ActiveUploadScreen} from "@/screens/phone/ActiveUploadScreen";
import {MusicAlbumScreen} from "@/screens/phone/MusicAlbumScreen";
import {MusicChannelScreen} from "@/screens/phone/MusicChannelScreen";
import {MusicLibraryScreen} from "@/screens/phone/MusicLibraryScreen";
import {MusicPlayerScreen} from "@/screens/phone/MusicPlayerScreen";
import {MusicPlaylistScreen} from "@/screens/phone/MusicPlaylistScreen";
import {MusicSearchScreen} from "@/screens/phone/MusicSearchScreen";
import VideoScreenWrapper from "@/screens/phone/VideoScreenWrapper";
import {YTNodes} from "@/utils/Youtube";

export type RootStackParamList = {
  LoadingScreen: undefined;
  Home: undefined;
  Trending: undefined;
  VideoScreen: {
    videoId: string;
    navEndpoint?: YTNodes.NavigationEndpoint;
    reel?: boolean;
    startSeconds?: number;
  };
  ChannelScreen: {channelId: string};
  PlaylistScreen: {playlistId: string};
  Search: undefined;
  SubscriptionScreen: undefined;
  History: undefined;
  SettingsScreen: undefined;
  LoginScreen: undefined;
  // TV
  VideoMenuContext: {element: ElementData};
  PlaylistManagerContextMenu: {videoId: string};
  VideoPlayerSettings: undefined;
  VideoPlayerPlaySpeed: undefined;
  VideoPlayerLanguage: undefined;
  // Downloads
  ActiveDownloadScreen: undefined;
  ActiveUploadScreen: undefined;
  DownloadPlayer: {id: string};
  // Music Screens
  MusicPlaylistScreen: {playlistId: string};
  MusicChannelScreen: {artistId: string};
  MusicAlbumScreen: {albumId: string};
  MusicSearchScreen: undefined;
  MusicLibraryScreen: undefined;
  MusicPlayerScreen: undefined;
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
          {Platform.isTV ? (
            <>
              <Stack.Screen
                name={"VideoMenuContext"}
                component={VideoMenuScreen}
                options={{presentation: "transparentModal"}}
              />
              <Stack.Screen
                name={"PlaylistManagerContextMenu"}
                component={PlaylistManagerContextMenu}
                options={{presentation: "transparentModal"}}
              />
              <Stack.Screen
                name={"VideoPlayerSettings"}
                component={VideoPlayerSettings}
                options={{presentation: "transparentModal"}}
              />
              <Stack.Screen
                name={"VideoPlayerPlaySpeed"}
                component={VideoPlayerSpeed}
                options={{presentation: "transparentModal"}}
              />
              <Stack.Screen
                name={"VideoPlayerLanguage"}
                component={VideoPlayerLanguage}
                options={{presentation: "transparentModal"}}
              />
            </>
          ) : null}
          <Stack.Screen name={"History"} component={HistoryScreen} />
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
            name={"ActiveUploadScreen"}
            component={ActiveUploadScreen}
            options={{headerTitle: "Active Uploads"}}
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
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
