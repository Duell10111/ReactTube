import "react-native-url-polyfill/auto";
import "event-target-polyfill";
import "fast-text-encoding";

import React from "react";
import {StatusBar, useColorScheme} from "react-native";
import FlashMessage from "react-native-flash-message";
import {GestureHandlerRootView} from "react-native-gesture-handler";
import {btoa, atob} from "react-native-quick-base64";

// import "react-native/tvos-types.d";
import {SafeAreaProvider} from "react-native-safe-area-context";

import AccountContextProvider from "./src/context/AccountContext";
import AppDataContextProvider from "./src/context/AppDataContext";
import AppStyleProvider from "./src/context/AppStyleContext";
import {DownloaderContext} from "./src/context/DownloaderContext";
import YoutubeContextProvider from "./src/context/YoutubeContext";
import Navigation from "./src/navigation/Navigation";
import BackgroundWrapper from "./src/utils/BackgroundWrapper";

// Polyfill for youtube.js
Object.assign(global, {
  btoa,
  atob,
});

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
                  <StatusBar
                    // TODO: Currently only dark-mode exists
                    barStyle={isDarkMode ? "light-content" : "light-content"}
                  />
                  <SafeAreaProvider>
                    <Navigation />
                    <FlashMessage position={"top"} />
                  </SafeAreaProvider>
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
