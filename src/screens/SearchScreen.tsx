import React from "react";
import useSearchScreen from "../hooks/useSearchScreen";
import SearchBar from "../components/search/SearchBar";
import HomeShelf from "../components/HomeShelf";
import {StyleSheet, Text, View} from "react-native";

export default function SearchScreen() {
  const {search, searchResult, fetchMore} = useSearchScreen();

  // console.log(JSON.stringify(searchResult));

  console.log(searchResult.length);

  return (
    <>
      <SearchBar onSubmit={text => search(text).catch(console.warn)} />
      <View style={{flex: 1}}>
        <HomeShelf
          shelfItem={searchResult}
          onEndReached={() => fetchMore().catch(console.warn)}
        />
      </View>
    </>
  );
}
