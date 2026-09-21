import React from "react";

import {SectionTitle} from "@/components/library/SectionTitle";
import useHistory from "@/hooks/tv/useHistory";
import {useTranslation} from "@/localization";
import {MediaFeed} from "@/ui/patterns";

export default function HistoryScreen() {
  const {data, fetchMore, refresh, refreshing, loading, error} = useHistory();
  const {t} = useTranslation();

  return (
    <MediaFeed
      ListHeaderComponent={<SectionTitle title={t("navigation.history")} />}
      error={error}
      items={data}
      loading={loading}
      onEndReached={fetchMore}
      onRefresh={refresh}
      onRetry={refresh}
      refreshing={refreshing}
      testID={"history-feed"}
    />
  );
}
