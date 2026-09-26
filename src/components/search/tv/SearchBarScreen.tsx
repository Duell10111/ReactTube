import React, {useEffect} from "react";
import {StyleSheet, TVEventControl, View} from "react-native";
import {RnNativeSearchBarView} from "rn-native-search-bar";

import {SearchResultFeed} from "@/components/search/SearchResultFeed";
import {useTranslation} from "@/localization";
import type {FeedItem} from "@/ui/patterns";
import {useAppTheme} from "@/ui/theme";

interface SearchBarScreenProps {
  items: FeedItem[];
  hints: string[];
  query: string;
  loading: boolean;
  error: unknown;
  performSearch(text: string): void;
  fetchMore(): Promise<unknown>;
}

export function SearchBarScreen({
  hints,
  items,
  query,
  loading,
  error,
  performSearch,
  fetchMore,
}: SearchBarScreenProps) {
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  useEffect(() => {
    TVEventControl.disableGestureHandlersCancelTouches();
    return () => TVEventControl.enableGestureHandlersCancelTouches();
  }, []);

  return (
    <View style={styles.container}>
      <RnNativeSearchBarView
        style={[styles.searchBar, {backgroundColor: theme.colors.surface}]}
        placeholder={t("search.placeholder")}
        searchHints={hints}
        onSearchTextChanged={event => performSearch(event.nativeEvent.text)}
        onSearchButtonClicked={event => performSearch(event.nativeEvent.text)}
        onSearchTextEditEndedEvent={event => {
          performSearch(event.nativeEvent.text);
        }}>
        <View style={styles.container}>
          <SearchResultFeed
            error={error}
            fetchMore={fetchMore}
            items={items}
            loading={loading}
            query={query}
          />
        </View>
      </RnNativeSearchBarView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    width: "100%",
    height: "100%",
  },
});
