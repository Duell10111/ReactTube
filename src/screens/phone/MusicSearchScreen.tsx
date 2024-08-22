import {useNavigation} from "@react-navigation/native";
import {NativeStackNavigationProp} from "@react-navigation/native-stack";
import _ from "lodash";
import React, {useCallback, useEffect, useLayoutEffect, useState} from "react";
import {FlatList, ListRenderItem, View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";

import {MusicBottomPlayerBar} from "../../components/music/MusicBottomPlayerBar";
import MusicHorizontalItem from "../../components/music/MusicHorizontalItem";
import {SearchBarSuggestions} from "../../components/search/SearchBarSuggestions";
import {SearchNoResultsScreen} from "../../components/search/SearchNoResultsScreen";
import {HorizontalData} from "../../extraction/ShelfExtraction";
import useMusicSearch from "../../hooks/music/useMusicSearch";
import {RootStackParamList} from "../../navigation/RootStackNavigator";

export function MusicSearchScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {search, parsedData, searchSuggestions} = useMusicSearch();

  const [searchText, setSearchText] = useState("");
  const [suggestions, setSearchSuggestions] = useState<string[]>([]);
  const [searchBarOpen, setSearchBarOpen] = useState(false);

  const debouncedOnChange = useCallback(
    _.debounce(text => {
      console.log("Finished typing:", text);
      search(text);
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

  useEffect(() => {
    searchSuggestions(searchText)
      .then(setSearchSuggestions)
      .catch(console.warn);
  }, [searchText]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerSearchBarOptions: {
        placeholder: "Search",
        onChangeText: event => setSearchText(event.nativeEvent.text),
        onSearchButtonPress: event => {
          performSearch(event.nativeEvent.text);
        },
        onOpen: () => setSearchBarOpen(true),
        onFocus: () => setSearchBarOpen(true),
        onClose: () => setSearchBarOpen(false),
        onBlur: () => setSearchBarOpen(false),
        textColor: "white",
        headerIconColor: "white",
        hintTextColor: "white",
        hideWhenScrolling: false,
        autoFocus: true,
      },
    });
  }, [navigation]);

  const renderItem = useCallback<ListRenderItem<HorizontalData>>(({item}) => {
    return <MusicHorizontalItem data={item} />;
  }, []);

  console.log("Bar open: ", searchBarOpen);

  // TODO: Disable suggestions as search bar can not be closed manually atm after clicking Maybe use focus of resul list?
  // if (searchBarOpen) {
  //   return (
  //     <SearchBarSuggestions
  //       suggestions={suggestions}
  //       onSuggestionClick={text => performSearch(text)}
  //     />
  //   );
  // }

  if (parsedData.length === 0) {
    return <SearchNoResultsScreen />;
  }

  return (
    <SafeAreaView style={{backgroundColor: "red", marginTop: 50}}>
      <FlatList
        contentInsetAdjustmentBehavior={"automatic"}
        style={{}}
        data={parsedData}
        renderItem={renderItem}
        // onEndReached={fetchContinuation}
      />
    </SafeAreaView>
  );
}
