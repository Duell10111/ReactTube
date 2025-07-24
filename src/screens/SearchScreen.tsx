import {useNavigation} from "@react-navigation/native";
import {NativeStackNavigationProp} from "@react-navigation/native-stack";
import _ from "lodash";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {Platform, View} from "react-native";
import {SearchBarCommands} from "react-native-screens";

import GridView from "../components/GridView";
import useGridColumnsPreferred from "../hooks/home/useGridColumnsPreferred";
import useSearchScreen from "../hooks/useSearchScreen";
import Logger from "../utils/Logger";

import {SearchBarSuggestions} from "@/components/search/SearchBarSuggestions";
import {SearchBarScreen} from "@/components/search/tv/SearchBarScreen";
import {RootStackParamList} from "@/navigation/RootStackNavigator";

const LOGGER = Logger.extend("SEARCH_SCREEN");

export default function SearchScreen() {
  const {
    search,
    searchResult,
    fetchMore,
    searchSuggestions,
    parsedSearchResults,
  } = useSearchScreen();
  const [searchText, setSearchText] = useState("");
  const [hints, setHints] = useState<string[]>([]);

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

  // Phone device specific hooks
  const [searchBarOpen, setSearchBarOpen] = useState(false);
  const searchBarRef = useRef<SearchBarCommands>(undefined);

  // console.log("Searchtext: ", searchText);
  // console.log("Hints: ", hints);

  useEffect(() => {
    console.log("Trigger Search Suggestions!");
    if (searchText.trim().length >= 1) {
      searchSuggestions(searchText).then(setHints).catch(LOGGER.warn);
    }
  }, [searchText]);

  if (!Platform.isTV) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useLayoutEffect(() => {
      navigation.setOptions({
        headerSearchBarOptions: {
          placeholder: "Search",
          onChangeText: event => setSearchText(event.nativeEvent.text),
          onSearchButtonPress: event => {
            performSearch(event.nativeEvent.text);
          },
          textColor: "white",
          headerIconColor: "white",
          hintTextColor: "white",
          hideWhenScrolling: false,
          // @ts-ignore
          ref: searchBarRef,
          onOpen: () => setSearchBarOpen(true),
          onFocus: () => setSearchBarOpen(true),
          onClose: () => setSearchBarOpen(false),
          onBlur: () => setSearchBarOpen(false),
        },
      });
    }, [navigation]);
  }

  if (Platform.isTV) {
    return (
      <SearchBarScreen
        // @ts-ignore
        data={parsedSearchResults}
        hints={hints}
        performSearch={performSearch}
        // @ts-ignore
        fetchMore={fetchMore}
      />
    );
  }

  if (searchBarOpen) {
    return (
      <SearchBarSuggestions
        suggestions={hints}
        onSuggestionClick={text => {
          searchBarRef.current?.setText(text);
          searchBarRef.current?.blur();
          performSearch(text);
        }}
      />
    );
  }

  return (
    <View style={{flex: 1}}>
      <GridView
        style={{marginTop: Platform.OS === "ios" ? 100 : 0}}
        columns={columns}
        shelfItem={searchResult}
        onEndReached={() => fetchMore().catch(console.warn)}
      />
    </View>
  );
}
