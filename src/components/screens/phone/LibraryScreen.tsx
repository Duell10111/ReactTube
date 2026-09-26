import {useMemo} from "react";

import useLibrary from "@/hooks/tv/useLibrary";
import {MediaSectionFeed} from "@/ui/patterns";

export function LibraryScreen() {
  const {data, fetchMore, refresh, refreshing, loading, error} = useLibrary();

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

  return (
    <MediaSectionFeed
      error={error}
      items={sections}
      loading={loading}
      onEndReached={fetchMore}
      onRefresh={refresh}
      onRetry={refresh}
      refreshing={refreshing}
      testID={"library-section-feed"}
    />
  );
}
