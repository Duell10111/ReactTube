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
import {Platform, StyleSheet, View} from "react-native";
import {SearchBarCommands} from "react-native-screens";

import {SearchBarSuggestions} from "@/components/search/SearchBarSuggestions";
import {SearchResultFeed} from "@/components/search/SearchResultFeed";
import {SearchBarScreen} from "@/components/search/tv/SearchBarScreen";
import useSearchScreen from "@/hooks/useSearchScreen";
import {useTranslation} from "@/localization";
import {RootStackParamList} from "@/navigation/RootStackNavigator";
import {useAppTheme} from "@/ui/theme";
import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("SEARCH_SCREEN");

/** Time without input before the typed term is searched for. */
const searchDebounce = 1000;

export default function SearchScreen() {
  const {
    search,
    query,
    fetchMore,
    searchSuggestions,
    parsedSearchResults,
    loading,
    error,
  } = useSearchScreen();
  const [searchText, setSearchText] = useState("");
  const [hints, setHints] = useState<string[]>([]);
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const debouncedSearch = useRef(
    _.debounce((text: string) => {
      search(text).catch(LOGGER.warn);
    }, searchDebounce),
  ).current;

  const performSearch = useCallback(
    (text?: string) => {
      const nextQuery = text ?? searchText;

      debouncedSearch.cancel();
      debouncedSearch(nextQuery);

      if (text !== undefined) {
        setSearchText(text);
      }
    },
    [debouncedSearch, searchText],
  );

  // Phone device specific state
  const [searchBarOpen, setSearchBarOpen] = useState(false);
  const searchBarRef = useRef<SearchBarCommands>(undefined);

  useEffect(() => {
    if (searchText.trim().length < 1) {
      setHints([]);
      return;
    }

    searchSuggestions(searchText).then(setHints).catch(LOGGER.warn);
  }, [searchSuggestions, searchText]);

  // Kept in a ref so re-registering the native search bar on every keystroke
  // cannot drop its focus mid-input.
  const performSearchRef = useRef(performSearch);
  performSearchRef.current = performSearch;

  useLayoutEffect(() => {
    if (Platform.isTV) {
      return;
    }

    navigation.setOptions({
      headerSearchBarOptions: {
        placeholder: t("search.placeholder"),
        onChangeText: event => setSearchText(event.nativeEvent.text),
        onSearchButtonPress: event => {
          performSearchRef.current(event.nativeEvent.text);
        },
        textColor: theme.colors.textPrimary,
        headerIconColor: theme.colors.textPrimary,
        hintTextColor: theme.colors.textSecondary,
        hideWhenScrolling: false,
        // @ts-ignore
        ref: searchBarRef,
        onOpen: () => setSearchBarOpen(true),
        onFocus: () => setSearchBarOpen(true),
        onClose: () => setSearchBarOpen(false),
        onBlur: () => setSearchBarOpen(false),
      },
    });
  }, [navigation, t, theme]);

  if (Platform.isTV) {
    return (
      <SearchBarScreen
        error={error}
        fetchMore={fetchMore}
        hints={hints}
        items={parsedSearchResults}
        loading={loading}
        performSearch={performSearch}
        query={query}
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
    <View
      style={[
        styles.container,
        // The native search bar overlays the list on iOS.
        Platform.OS === "ios" ? {paddingTop: 100} : undefined,
      ]}>
      <SearchResultFeed
        error={error}
        fetchMore={fetchMore}
        items={parsedSearchResults}
        loading={loading}
        query={query}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
