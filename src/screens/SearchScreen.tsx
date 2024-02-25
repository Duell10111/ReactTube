import {useNavigation} from "@react-navigation/native";
import {NativeStackNavigationProp} from "@react-navigation/native-stack";
import _ from "lodash";
import React, {useCallback, useLayoutEffect, useState} from "react";
import {Platform, StyleSheet, View} from "react-native";
import {RnNativeSearchBarView} from "rn-native-search-bar";

import GridView from "../components/GridView";
import SearchBar from "../components/search/SearchBar";
import useGridColumnsPreferred from "../hooks/home/useGridColumnsPreferred";
import useSearchScreen from "../hooks/useSearchScreen";
import {RootStackParamList} from "../navigation/RootStackNavigator";

export default function SearchScreen() {
  const {search, searchResult, fetchMore} = useSearchScreen();
  const [searchText, setSearchText] = useState("");

  const columns = useGridColumnsPreferred();

  // console.log(JSON.stringify(searchResult));

  console.log(searchResult.length);

  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const debouncedOnChange = useCallback(
    _.debounce(text => {
      console.log("Finished typing:", text);
      search(text).catch(console.warn);
      // Perform your action here, e.g., API call, validation
    }, 1000),
    [],
  ); // 1000ms delay

  const performSearch = (text?: string) => {
    const query = text ?? searchText;
    console.log("Search: ", query);
    // TODO: Clear results on empty string?!

    debouncedOnChange.cancel();
    debouncedOnChange(query);
    if (text) {
      setSearchText(text);
    }
  };

  console.log("Searchtext: ", searchText);

  if (!Platform.isTV) {
    useLayoutEffect(() => {
      navigation.setOptions({
        headerSearchBarOptions: {
          placeholder: "Search",
          onChangeText: event => setSearchText(event.nativeEvent.text),
          onBlur: () => performSearch(),
          onSearchButtonPress: event => {
            performSearch(event.nativeEvent.text);
          },
          onClose: () => performSearch(),
          textColor: "white",
          headerIconColor: "white",
          hideWhenScrolling: false,
        },
      });
    }, [navigation]);
  }

  return (
    <View style={{flex: 1}}>
      {Platform.isTV ? (
        <RnNativeSearchBarView
          style={{width: "100%", height: "100%", backgroundColor: "#555555"}}
          placeholder="Search"
          onSearchTextChanged={event => performSearch(event.nativeEvent.text)}
          onSearchButtonClicked={event => performSearch(event.nativeEvent.text)}
          onSearchTextEditEndedEvent={() =>
            console.log("SearchTextEdit Ended!")
          }>
          <View style={{flex: 1}}>
            <GridView
              columns={columns}
              shelfItem={searchResult}
              onEndReached={() => fetchMore().catch(console.warn)}
            />
          </View>
        </RnNativeSearchBarView>
      ) : null}
      {!Platform.isTV ? (
        <View style={{flex: 1}}>
          <GridView
            columns={columns}
            shelfItem={searchResult}
            onEndReached={() => fetchMore().catch(console.warn)}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  searchView: {
    width: 1920,
    height: 500,
    backgroundColor: "yellow",
  },
});
