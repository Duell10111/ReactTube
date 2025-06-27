import "react-native-url-polyfill/auto";
import "event-target-polyfill";
import "fast-text-encoding";

import React from "react";
import {StatusBar, useColorScheme} from "react-native";
import FlashMessage from "react-native-flash-message";
import {GestureHandlerRootView} from "react-native-gesture-handler";
import {PaperProvider} from "react-native-paper";
import {btoa, atob} from "react-native-quick-base64";

import AccountContextProvider from "./src/context/AccountContext";
import AppDataContextProvider from "./src/context/AppDataContext";
import AppStyleProvider from "./src/context/AppStyleContext";
import YoutubeContextProvider from "./src/context/YoutubeContext";
import Navigation from "./src/navigation/Navigation";
import BackgroundWrapper from "./src/utils/BackgroundWrapper";

import {VideoProvider} from "@/components/corner-video/VideoProvider";
import {VideoPlayerSettingsContext} from "@/components/video/videoPlayer/settings/VideoPlayerSettingsContext";
import {DownloaderContext} from "@/context/DownloaderContext";
import {MusicPlayerContext} from "@/context/MusicPlayerContext";
import {PlaylistManagerContext} from "@/context/PlaylistManagerContext";
import {setupMusicPlayer} from "@/utils/music/MusicInit";

// Polyfill for youtube.js
Object.assign(global, {
  btoa,
  atob,
});

// enableFreeze(true);

setupMusicPlayer();

const App = () => {
  const isDarkMode = useColorScheme() === "dark";

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <PaperProvider>
        <AppStyleProvider>
          <BackgroundWrapper>
            <AppDataContextProvider>
              <YoutubeContextProvider>
                <AccountContextProvider>
                  <MusicPlayerContext>
                    <DownloaderContext>
                      <PlaylistManagerContext>
                        <StatusBar
                          // TODO: Currently only dark-mode exists
                          barStyle={
                            isDarkMode ? "light-content" : "light-content"
                          }
                        />
                        <VideoPlayerSettingsContext>
                          <VideoProvider>
                            <Navigation />
                          </VideoProvider>
                        </VideoPlayerSettingsContext>
                        <FlashMessage position={"top"} />
                      </PlaylistManagerContext>
                    </DownloaderContext>
                  </MusicPlayerContext>
                </AccountContextProvider>
              </YoutubeContextProvider>
            </AppDataContextProvider>
          </BackgroundWrapper>
        </AppStyleProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
};

export default App;
