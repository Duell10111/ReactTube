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
import {FlatList, StatusBar, Text, useColorScheme} from "react-native";

import {Colors} from "react-native/Libraries/NewAppScreen";

import "react-native/tvos-types.d";
import Navigation from "./src/navigation/Navigation";
import YoutubeContextProvider from "./src/context/YoutubeContext";

const App = () => {
  const isDarkMode = useColorScheme() === "dark";

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  // return <FlatList data={["", ""]} renderItem={() => <Text>test</Text>} />;

  return (
    <YoutubeContextProvider>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <Navigation />
    </YoutubeContextProvider>
  );
};

export default App;
