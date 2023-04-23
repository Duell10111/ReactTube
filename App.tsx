/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */

import React from "react";
import {StatusBar, useColorScheme} from "react-native";
import {btoa, atob} from "react-native-quick-base64";

import "react-native/tvos-types.d";
import Navigation from "./src/navigation/Navigation";
import YoutubeContextProvider from "./src/context/YoutubeContext";
import AppStyleProvider from "./src/context/AppStyleContext";
import BackgroundWrapper from "./src/utils/BackgroundWrapper";
import AppDataContextProvider from "./src/context/AppDataContext";

// Polyfill for youtube.js
Object.assign(global, {
  btoa: btoa,
  atob: atob,
});

const App = () => {
  const isDarkMode = useColorScheme() === "dark";

  return (
    <AppStyleProvider>
      <AppDataContextProvider>
        <YoutubeContextProvider>
          <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
          <Navigation />
        </YoutubeContextProvider>
      </AppDataContextProvider>
    </AppStyleProvider>
  );
};

export default App;
