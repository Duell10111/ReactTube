import React from "react";

import {SectionTitle} from "@/components/library/SectionTitle";
import usePlaylists from "@/hooks/tv/usePlaylists";
import {useTranslation} from "@/localization";
import {MediaFeed} from "@/ui/patterns";

export function PlaylistsScreen() {
  const {data, fetchMore, refresh, refreshing, loading, error} = usePlaylists();
  const {t} = useTranslation();

  return (
    <MediaFeed
      ListHeaderComponent={<SectionTitle title={t("navigation.playlists")} />}
      error={error}
      items={data}
      loading={loading}
      onEndReached={fetchMore}
      onRefresh={refresh}
      onRetry={refresh}
      refreshing={refreshing}
      testID={"playlists-feed"}
    />
  );
}
