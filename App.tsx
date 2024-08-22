import "react-native-url-polyfill/auto";
import "event-target-polyfill";
import "fast-text-encoding";

import React from "react";
import {StatusBar, useColorScheme} from "react-native";
import FlashMessage from "react-native-flash-message";
import {GestureHandlerRootView} from "react-native-gesture-handler";
import {btoa, atob} from "react-native-quick-base64";
import {SafeAreaProvider} from "react-native-safe-area-context";

import AccountContextProvider from "./src/context/AccountContext";
import AppDataContextProvider from "./src/context/AppDataContext";
import AppStyleProvider from "./src/context/AppStyleContext";
import {DownloaderContext} from "./src/context/DownloaderContext";
import {MusicPlayerContext} from "./src/context/MusicPlayerContext";
import YoutubeContextProvider from "./src/context/YoutubeContext";
import Navigation from "./src/navigation/Navigation";
import BackgroundWrapper from "./src/utils/BackgroundWrapper";
import {setupMusicPlayer} from "./src/utils/music/MusicInit";

// Polyfill for youtube.js
Object.assign(global, {
  btoa,
  atob,
});

setupMusicPlayer();

const App = () => {
  const isDarkMode = useColorScheme() === "dark";

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <AppStyleProvider>
        <BackgroundWrapper>
          <AppDataContextProvider>
            <YoutubeContextProvider>
              <AccountContextProvider>
                <DownloaderContext>
                  <MusicPlayerContext>
                    <StatusBar
                      // TODO: Currently only dark-mode exists
                      barStyle={isDarkMode ? "light-content" : "light-content"}
                    />
                    <Navigation />
                    <FlashMessage position={"top"} />
                  </MusicPlayerContext>
                </DownloaderContext>
              </AccountContextProvider>
            </YoutubeContextProvider>
          </AppDataContextProvider>
        </BackgroundWrapper>
      </AppStyleProvider>
    </GestureHandlerRootView>
  );
};

export default App;
