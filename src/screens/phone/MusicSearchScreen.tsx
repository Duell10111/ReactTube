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
import {useTranslation} from "@/localization";
import {RootStackParamList} from "@/navigation/RootStackNavigator";
import {useAppTheme} from "@/ui/theme";

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
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  const debouncedOnChange = useCallback(
    _.debounce(text => {
      search(text);
    }, 1000),
    [],
  );

  const performSearch = (text?: string) => {
    const query = text ?? searchText;
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
        placeholder: t("search.placeholder"),
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
        textColor: theme.colors.textPrimary,
        headerIconColor: theme.colors.textPrimary,
        hintTextColor: theme.colors.textSecondary,
        hideWhenScrolling: false,
        autoFocus: true,
      },
    });
  }, [navigation, t, theme]);

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
