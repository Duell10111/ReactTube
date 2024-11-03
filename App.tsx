import "react-native-url-polyfill/auto";
import "event-target-polyfill";
import "fast-text-encoding";

import * as Sentry from "@sentry/react-native";
import {isRunningInExpoGo} from "expo";
import React from "react";
import {StatusBar, useColorScheme} from "react-native";
import FlashMessage from "react-native-flash-message";
import {GestureHandlerRootView} from "react-native-gesture-handler";
import {btoa, atob} from "react-native-quick-base64";
import {SafeAreaProvider} from "react-native-safe-area-context";
import {enableFreeze} from "react-native-screens";

import AccountContextProvider from "./src/context/AccountContext";
import AppDataContextProvider from "./src/context/AppDataContext";
import AppStyleProvider from "./src/context/AppStyleContext";
import YoutubeContextProvider from "./src/context/YoutubeContext";
import Navigation from "./src/navigation/Navigation";
import BackgroundWrapper from "./src/utils/BackgroundWrapper";

import {DownloaderContext} from "@/context/DownloaderContext";
import {MusicPlayerContext} from "@/context/MusicPlayerContext";
import {PlaylistManagerContext} from "@/context/PlaylistManagerContext";
import {navigationIntegration} from "@/utils/Sentry";
import {setupMusicPlayer} from "@/utils/music/MusicInit";

// Polyfill for youtube.js
Object.assign(global, {
  btoa,
  atob,
});

// enableFreeze(true);

setupMusicPlayer();

Sentry.init({
  dsn: "https://da1b676c958660ac2779ad1b0cc3efc8@o4508214540042240.ingest.de.sentry.io/4508214546464848",
  enabled: !__DEV__,
  debug: true, // If `true`, Sentry will try to print out useful debugging information if something goes wrong with sending the event. Set it to `false` in production
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.ReactNativeTracing({
      enableNativeFramesTracking: !isRunningInExpoGo(),
      routingInstrumentation: navigationIntegration,
      // ...
    }),
  ],
  enableAutoPerformanceTracing: true,
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
                  <PlaylistManagerContext>
                    <MusicPlayerContext>
                      <StatusBar
                        // TODO: Currently only dark-mode exists
                        barStyle={
                          isDarkMode ? "light-content" : "light-content"
                        }
                      />
                      <Navigation />
                      <FlashMessage position={"top"} />
                    </MusicPlayerContext>
                  </PlaylistManagerContext>
                </DownloaderContext>
              </AccountContextProvider>
            </YoutubeContextProvider>
          </AppDataContextProvider>
        </BackgroundWrapper>
      </AppStyleProvider>
    </GestureHandlerRootView>
  );
};

export default Sentry.wrap(App);
