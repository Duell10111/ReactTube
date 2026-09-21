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
import {useTranslation} from "@/localization";
import ChannelScreen from "@/screens/ChannelScreen";
import HomeWrapperScreen from "@/screens/HomeWrapperScreen";
import LoadingScreen from "@/screens/LoadingScreen";
import LoginScreen from "@/screens/LoginScreen";
import PlaylistScreen from "@/screens/PlaylistScreen";
import SearchScreen from "@/screens/SearchScreen";
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
import {useAppTheme} from "@/ui/theme";
import {YTNodes} from "@/utils/Youtube";

export type RootStackParamList = {
  LoadingScreen: undefined;
  Home: undefined;
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
  const {t} = useTranslation();
  const {theme} = useAppTheme();

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
            name={"VideoScreen"}
            component={Platform.isTV ? VideoScreen : VideoScreenWrapper}
            options={{title: t("navigation.video")}}
          />
          <Stack.Screen
            name={"ChannelScreen"}
            component={ChannelScreen}
            options={{title: t("navigation.channel")}}
          />
          <Stack.Screen
            name={"PlaylistScreen"}
            component={PlaylistScreen}
            options={{title: t("navigation.playlist")}}
          />
          <Stack.Screen
            name={"Search"}
            component={SearchScreen}
            options={{title: t("navigation.search")}}
          />
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
          <Stack.Screen
            name={"History"}
            component={HistoryScreen}
            options={{title: t("navigation.history")}}
          />
          <Stack.Screen
            name={"SettingsScreen"}
            component={SettingsNavigator}
            options={{headerTitle: t("navigation.settings")}}
          />
          <Stack.Screen
            name={"LoginScreen"}
            component={LoginScreen}
            options={{title: t("navigation.login")}}
          />
          {/* Download Screens*/}
          <Stack.Screen
            name={"ActiveDownloadScreen"}
            component={ActiveDownloadScreen}
            options={{headerTitle: t("navigation.activeDownloads")}}
          />
          <Stack.Screen
            name={"ActiveUploadScreen"}
            component={ActiveUploadScreen}
            options={{headerTitle: t("navigation.activeUploads")}}
          />
          {/* Music Screens*/}
          <Stack.Screen
            name={"MusicLibraryScreen"}
            component={MusicLibraryScreen}
            options={{title: t("navigation.musicLibrary")}}
          />
          <Stack.Screen
            name={"MusicSearchScreen"}
            component={MusicSearchScreen}
            options={{title: t("navigation.musicSearch")}}
          />
          <Stack.Screen
            name={"MusicPlaylistScreen"}
            component={MusicPlaylistScreen}
            options={{title: t("navigation.musicPlaylist")}}
          />
          <Stack.Screen
            name={"MusicChannelScreen"}
            component={MusicChannelScreen}
            options={{title: t("navigation.musicChannel")}}
          />
          <Stack.Screen
            name={"MusicAlbumScreen"}
            component={MusicAlbumScreen}
            options={{title: t("navigation.musicChannel")}}
          />
          <Stack.Screen
            name={"MusicPlayerScreen"}
            component={MusicPlayerScreen}
            options={{
              title: t("navigation.musicPlayer"),
              contentStyle: {backgroundColor: theme.colors.surfaceRaised},
              headerStyle: {backgroundColor: theme.colors.surfaceRaised},
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
