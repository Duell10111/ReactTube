import "./src/utils/RequireCycleWarnings";
import "react-native-url-polyfill/auto";
import "event-target-polyfill";
import "fast-text-encoding";
import "react-native-quick-base64";

import React, {useEffect, useMemo} from "react";
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
import {VideoSidePanelProvider} from "@/context/VideoSidePanelContext";
import {LocalizationProvider} from "@/localization";
import {appStatusBarStyle} from "@/ui/layout/appShell";
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

  useEffect(() => {
    FlashMessage.setColorTheme({
      danger: theme.colors.error,
      info: theme.colors.brand,
      success: theme.colors.success,
      warning: theme.colors.warning,
    });
  }, [theme]);

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
                        barStyle={appStatusBarStyle}
                        backgroundColor={theme.colors.background}
                      />
                      <VideoPlayerSettingsContext>
                        <VideoSidePanelProvider>
                          <VideoProvider>
                            <Navigation />
                          </VideoProvider>
                        </VideoSidePanelProvider>
                      </VideoPlayerSettingsContext>
                      <FlashMessage
                        backgroundColor={theme.colors.surfaceRaised}
                        color={theme.colors.textPrimary}
                        position={"top"}
                        style={{borderRadius: theme.radii.control}}
                        textStyle={theme.typography.bodySmall}
                        titleStyle={theme.typography.label}
                      />
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
