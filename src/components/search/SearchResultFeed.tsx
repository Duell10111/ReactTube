import React from "react";

import {useTranslation} from "@/localization";
import {MediaFeed, type FeedItem} from "@/ui/patterns";

export interface SearchResultFeedProps {
  items: FeedItem[];
  query: string;
  loading: boolean;
  error: unknown;
  fetchMore: () => Promise<unknown>;
}

/**
 * Search results plus the two empty cases that are easy to confuse: no query
 * entered yet, and a query that matched nothing.
 */
export function SearchResultFeed({
  items,
  query,
  loading,
  error,
  fetchMore,
}: SearchResultFeedProps) {
  const {t} = useTranslation();
  const searched = query.trim().length > 0;

  return (
    <MediaFeed
      emptyMessage={
        searched ? t("search.noResults.message") : t("search.empty.message")
      }
      emptyTitle={
        searched ? t("search.noResults.title") : t("search.empty.title")
      }
      error={error}
      items={items}
      loading={loading}
      onEndReached={fetchMore}
      testID={"search-feed"}
    />
  );
}
