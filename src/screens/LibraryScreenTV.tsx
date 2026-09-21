import React from "react";

import {LibraryHeaderTV} from "@/components/library/LibraryHeaderTV";
import useLibrary from "@/hooks/tv/useLibrary";
import {MediaFeed} from "@/ui/patterns";

export function LibraryScreenTV() {
  const {data, fetchMore, refresh, refreshing, loading, error} = useLibrary();

  // TODO: Integrate old YTLibrarySection Items again?!

  return (
    <MediaFeed
      ListHeaderComponent={<LibraryHeaderTV />}
      error={error}
      items={data}
      loading={loading}
      onEndReached={fetchMore}
      onRefresh={refresh}
      onRetry={refresh}
      refreshing={refreshing}
      testID={"library-feed"}
    />
  );
}
