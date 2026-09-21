import "./src/utils/RequireCycleWarnings";
import "react-native-url-polyfill/auto";
import "event-target-polyfill";
import "fast-text-encoding";
import "react-native-quick-base64";

import React, {useMemo} from "react";
import {StatusBar} from "react-native";
import FlashMessage from "react-native-flash-message";
import {GestureHandlerRootView} from "react-native-gesture-handler";
import {PaperProvider} from "react-native-paper";

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
import {LocalizationProvider} from "@/localization";
import {paperTheme, useAppTheme} from "@/ui/theme";

function ThemedApp() {
  const {theme, reduceMotion} = useAppTheme();
  const resolvedPaperTheme = useMemo(
    () => ({
      ...paperTheme,
      animation: {
        ...paperTheme.animation,
        scale: reduceMotion ? 0 : 1,
      },
    }),
    [reduceMotion],
  );

  return (
    <PaperProvider theme={resolvedPaperTheme}>
      <BackgroundWrapper>
        <AppDataContextProvider>
          <LocalizationProvider>
            <YoutubeContextProvider>
              <AccountContextProvider>
                <MusicPlayerContext>
                  <DownloaderContext>
                    <PlaylistManagerContext>
                      <StatusBar
                        barStyle={"light-content"}
                        backgroundColor={theme.colors.background}
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
          </LocalizationProvider>
        </AppDataContextProvider>
      </BackgroundWrapper>
    </PaperProvider>
  );
}

const App = () => {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <AppStyleProvider>
        <ThemedApp />
      </AppStyleProvider>
    </GestureHandlerRootView>
  );
};

export default App;
