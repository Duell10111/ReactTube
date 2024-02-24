import {RnSearchBarView} from "@duell10111/rn-search-bar";
import React from "react";
import {View} from "react-native";

import GridView from "../components/GridView";
import SearchBar from "../components/search/SearchBar";
import useGridColumnsPreferred from "../hooks/home/useGridColumnsPreferred";
import useSearchScreen from "../hooks/useSearchScreen";

export default function SearchScreen() {
  const {search, searchResult, fetchMore} = useSearchScreen();

  const columns = useGridColumnsPreferred();

  // console.log(JSON.stringify(searchResult));

  console.log(searchResult.length);

  return (
    <View style={{flex: 1}}>
      <RnSearchBarView color="red" style={{width: "100%", height: 400}} />
      <View style={{flex: 1}}>
        <GridView
          columns={columns}
          shelfItem={searchResult}
          onEndReached={() => fetchMore().catch(console.warn)}
        />
      </View>
    </View>
  );
}
