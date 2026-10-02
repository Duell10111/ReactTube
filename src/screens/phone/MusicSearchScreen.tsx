import {useNavigation} from "@react-navigation/native";
import {NativeStackNavigationProp} from "@react-navigation/native-stack";
import _ from "lodash";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {FlatList, ListRenderItem, StyleSheet, View} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {SearchBarCommands} from "react-native-screens";

import {MusicBottomPlayerBar} from "@/components/music/MusicBottomPlayerBar";
import {MusicSearchFilterHeader} from "@/components/music/MusicSearchFilterHeader";
import MusicSearchSectionItem from "@/components/music/MusicSearchSectionItem";
import {MusicTrackRow} from "@/components/music/sections/MusicTrackRow";
import {musicSurfacePadding} from "@/components/music/sections/musicSectionModel";
import {SearchBarSuggestions} from "@/components/search/SearchBarSuggestions";
import {SearchNoResultsScreen} from "@/components/search/SearchNoResultsScreen";
import {HorizontalData} from "@/extraction/ShelfExtraction";
import {ElementData} from "@/extraction/Types";
import useMusicSearch from "@/hooks/music/useMusicSearch";
import {useTranslation} from "@/localization";
import {RootStackParamList} from "@/navigation/RootStackNavigator";
import {EmptyState} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

export function MusicSearchScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    search,
    searchedQuery,
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

  // Sections and a filtered shelf share one list, so switching a category
  // swaps rows instead of remounting the scroll view the header tracks.
  const entries = useMemo<MusicSearchEntry[]>(
    () =>
      parsedMusicShelfData
        ? parsedMusicShelfData.map(element => ({kind: "item", element}))
        : parsedData.map(section => ({kind: "section", section})),
    [parsedData, parsedMusicShelfData],
  );

  const renderItem = useCallback<ListRenderItem<MusicSearchEntry>>(
    ({item}) =>
      item.kind === "section" ? (
        <MusicSearchSectionItem
          data={item.section}
          onPress={() => extendMusicShelf(item.section)}
        />
      ) : (
        <View style={styles.row}>
          <MusicTrackRow element={item.element} videoFrame />
        </View>
      ),
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

  if (parsedData.length === 0) {
    // The native header overlays the screen, so the state is centered in the
    // whole screen instead of starting right under the search bar.
    return (
      <View style={styles.emptyState}>
        {searchedQuery === undefined ? (
          <EmptyState
            message={t("search.music.empty.message")}
            title={t("search.music.empty.title")}
          />
        ) : (
          <SearchNoResultsScreen />
        )}
      </View>
    );
  }

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <FlatList
        contentInsetAdjustmentBehavior={"automatic"}
        data={entries}
        // Sections without a known key (e.g. the notice above the results)
        // share an id, and a filtered shelf can repeat an entry.
        keyExtractor={(entry, index) =>
          `${entry.kind}-${
            entry.kind === "section" ? entry.section.id : entry.element.id
          }-${index}`
        }
        ListHeaderComponent={
          cloudChip ? (
            <View style={{backgroundColor: theme.colors.background}}>
              <MusicSearchFilterHeader
                closeable={!!parsedMusicShelfData}
                data={cloudChip}
                onClick={chip => extendMusicShelfViaFilter(chip)}
                onClose={() => clearDetailsData()}
              />
            </View>
          ) : null
        }
        onEndReached={parsedMusicShelfData ? fetchMoreShelfData : undefined}
        renderItem={renderItem}
        stickyHeaderIndices={cloudChip ? [0] : undefined}
      />
      <MusicBottomPlayerBar />
    </SafeAreaView>
  );
}

type MusicSearchEntry =
  | {kind: "section"; section: HorizontalData}
  | {kind: "item"; element: ElementData};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
  },
  row: {
    // The row pads its own pressed state, so the list pads a little less.
    paddingHorizontal: musicSurfacePadding - 4,
  },
});
