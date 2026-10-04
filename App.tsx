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
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import AccountContextProvider from "./src/context/AccountContext";
import AppDataContextProvider from "./src/context/AppDataContext";
import AppStyleProvider from "./src/context/AppStyleContext";
import YoutubeContextProvider from "./src/context/YoutubeContext";
import Navigation from "./src/navigation/Navigation";
import BackgroundWrapper from "./src/utils/BackgroundWrapper";

import {VideoProvider} from "@/components/corner-video/VideoProvider";
import PoTokenWebViewHost from "@/components/potoken/PoTokenWebViewHost";
import {VideoPlayerSettingsContext} from "@/components/video/videoPlayer/settings/VideoPlayerSettingsContext";
import {DownloaderContext} from "@/context/DownloaderContext";
import {MusicPlayerContext} from "@/context/MusicPlayerContext";
import {VideoSidePanelProvider} from "@/context/VideoSidePanelContext";
import {LocalizationProvider} from "@/localization";
import {appStatusBarStyle} from "@/ui/layout/appShell";
import {paperTheme, useAppTheme} from "@/ui/theme";

function ThemedApp() {
  const {theme, reduceMotion} = useAppTheme();
  // The flash message library only knows outdated iPhone models and no tvOS
  // overscan, so feed it the real top inset instead of its own guess.
  const {top: safeAreaTop} = useSafeAreaInsets();
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
                      statusBarHeight={safeAreaTop}
                      style={{borderRadius: theme.radii.control}}
                      textStyle={theme.typography.bodySmall}
                      titleStyle={theme.typography.label}
                    />
                    <PoTokenWebViewHost />
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
      <SafeAreaProvider>
        <AppStyleProvider>
          <ThemedApp />
        </AppStyleProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
