import React from "react";
import useSearchScreen from "../hooks/useSearchScreen";
import SearchBar from "../components/search/SearchBar";
import {View} from "react-native";
import GridView from "../components/GridView";
import useGridColumnsPreferred from "../hooks/home/useGridColumnsPreferred";

export default function SearchScreen() {
  const {search, searchResult, fetchMore} = useSearchScreen();

  const columns = useGridColumnsPreferred();

  // console.log(JSON.stringify(searchResult));

  console.log(searchResult.length);

  return (
    <>
      <SearchBar onSubmit={text => search(text).catch(console.warn)} />
      <View style={{flex: 1}}>
        <GridView
          columns={columns}
          shelfItem={searchResult}
          onEndReached={() => fetchMore().catch(console.warn)}
        />
      </View>
    </>
  );
}
