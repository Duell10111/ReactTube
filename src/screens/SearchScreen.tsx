import React from "react";
import {Text, TextInput, View} from "react-native";
import useSearchScreen from "../hooks/useSearchScreen";

export default function SearchScreen() {
  const {search, searchResult} = useSearchScreen();

  return (
    <View>
      <Text>Search</Text>
      <TextInput />
    </View>
  );
}
