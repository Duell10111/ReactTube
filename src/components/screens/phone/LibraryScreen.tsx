import {useNavigation} from "@react-navigation/native";
import {useCallback, useMemo} from "react";

import type {HorizontalData} from "@/extraction/ShelfExtraction";
import {getLibraryShelfTarget} from "@/extraction/libraryShelf";
import useLibrary from "@/hooks/tv/useLibrary";
import type {RootNavProp} from "@/navigation/RootStackNavigator";
import {MediaFeed} from "@/ui/patterns";

export function LibraryScreen() {
  const {data, fetchMore, refresh, refreshing, loading, error} = useLibrary();
  const navigation = useNavigation<RootNavProp>();

  const sections = useMemo(
    () =>
      // The library opens with a shelf of navigation tiles (history,
      // playlists). Those carry no thumbnail and are dropped while parsing, so
      // without this filter the feed would render their title above nothing.
      data.filter(
        item => !("parsedData" in item) || item.parsedData.length > 0,
      ),
    [data],
  );

  const getShelfSeeAll = useCallback(
    (shelf: HorizontalData) => {
      const target = getLibraryShelfTarget(shelf);

      if (!target) {
        return undefined;
      }

      return target.type === "history"
        ? () => navigation.navigate("History")
        : () =>
            navigation.navigate("PlaylistScreen", {
              playlistId: target.playlistId,
            });
    },
    [navigation],
  );

  return (
    // Every section stays a horizontal row with a way to its full list, so the
    // whole library fits on a few screens instead of history alone filling
    // them with full-width cards.
    <MediaFeed
      error={error}
      getShelfSeeAll={getShelfSeeAll}
      items={sections}
      loading={loading}
      onEndReached={fetchMore}
      onRefresh={refresh}
      onRetry={refresh}
      refreshing={refreshing}
      shelfPresentation={"horizontal"}
      testID={"library-section-feed"}
    />
  );
}
