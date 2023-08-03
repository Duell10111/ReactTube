import React from "react";
import useSearchScreen from "../hooks/useSearchScreen";
import SearchBar from "../components/search/SearchBar";
import {View} from "react-native";
import GridView from "../components/GridView";

export default function SearchScreen() {
  const {search, searchResult, fetchMore} = useSearchScreen();

  // console.log(JSON.stringify(searchResult));

  console.log(searchResult.length);

  return (
    <>
      <SearchBar onSubmit={text => search(text).catch(console.warn)} />
      <View style={{flex: 1}}>
        <GridView
          shelfItem={searchResult}
          onEndReached={() => fetchMore().catch(console.warn)}
        />
      </View>
    </>
  );
}
