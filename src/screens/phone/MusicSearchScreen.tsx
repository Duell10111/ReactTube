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
import {FlatList, ListRenderItem, Platform} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {SearchBarCommands} from "react-native-screens";

import {MusicBottomPlayerBar} from "@/components/music/MusicBottomPlayerBar";
import {MusicSearchDetailsList} from "@/components/music/MusicSearchDetailsList";
import {MusicSearchFilterHeader} from "@/components/music/MusicSearchFilterHeader";
import MusicSearchSectionItem from "@/components/music/MusicSearchSectionItem";
import {SearchBarSuggestions} from "@/components/search/SearchBarSuggestions";
import {SearchNoResultsScreen} from "@/components/search/SearchNoResultsScreen";
import {HorizontalData} from "@/extraction/ShelfExtraction";
import useMusicSearch from "@/hooks/music/useMusicSearch";
import {RootStackParamList} from "@/navigation/RootStackNavigator";

export function MusicSearchScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    search,
    parsedData,
    searchSuggestions,
    parsedMusicShelfData,
    cloudChip,
    extendMusicShelf,
    fetchMoreShelfData,
    clearDetailsData,
    extendMusicShelfViaFilter,
  } = useMusicSearch();

  const [searchText, setSearchText] = useState("");
  const [suggestions, setSearchSuggestions] = useState<string[]>([]);
  const [searchBarOpen, setSearchBarOpen] = useState(false);
  const searchBarRef = useRef<SearchBarCommands>(null);

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
      .then(new_suggestions => {
        setSearchSuggestions(_.compact(new_suggestions));
      })
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
        // @ts-ignore Ignore null init value
        ref: searchBarRef,
        textColor: "white",
        headerIconColor: "white",
        hintTextColor: "white",
        hideWhenScrolling: false,
        autoFocus: true,
      },
    });
  }, [navigation]);

  const renderItem = useCallback<ListRenderItem<HorizontalData>>(
    ({item}) => {
      return (
        <MusicSearchSectionItem
          data={item}
          onPress={() => extendMusicShelf(item)}
        />
      );
    },
    [extendMusicShelf],
  );

  console.log(parsedData);

  console.log("Bar open: ", searchBarOpen);

  // TODO: Adapt to use music specific suggestions
  if (searchBarOpen) {
    return (
      <SearchBarSuggestions
        suggestions={suggestions}
        onSuggestionClick={text => {
          searchBarRef.current?.setText(text);
          searchBarRef.current?.blur();
          performSearch(text);
        }}
      />
    );
  }

  if (parsedMusicShelfData) {
    return (
      <MusicSearchDetailsList
        header={cloudChip}
        data={parsedMusicShelfData}
        onFetchMore={fetchMoreShelfData}
        onClose={() => clearDetailsData()}
        onClick={chip => extendMusicShelfViaFilter(chip)}
      />
    );
  }

  if (parsedData.length === 0) {
    return <SearchNoResultsScreen />;
  }

  return (
    <SafeAreaView
      style={[
        {flex: 1},
        Platform.OS === "ios"
          ? {paddingTop: 50, paddingBottom: 0}
          : {paddingTop: 0},
      ]}>
      {cloudChip ? (
        <MusicSearchFilterHeader
          data={cloudChip}
          onClick={chip => extendMusicShelfViaFilter(chip)}
        />
      ) : null}
      <FlatList
        contentInsetAdjustmentBehavior={"automatic"}
        data={parsedData}
        renderItem={renderItem}
        // onEndReached={fetchContinuation}
        // ListFooterComponent={<MusicBottomPlayerBar />}
      />
      <MusicBottomPlayerBar />
    </SafeAreaView>
  );
}
