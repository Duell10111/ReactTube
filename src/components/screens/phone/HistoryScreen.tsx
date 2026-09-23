import React from "react";
import {StyleSheet, View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import useHistory from "@/hooks/tv/useHistory";
import {useTranslation} from "@/localization";
import {MediaSectionFeed} from "@/ui/patterns";

export function HistoryScreen() {
  const {data, fetchMore, refresh, refreshing, loading, error} = useHistory();
  const {bottom, left, right} = useSafeAreaInsets();
  const {t} = useTranslation();

  return (
    <View
      style={[
        styles.container,
        {paddingBottom: bottom, paddingLeft: left, paddingRight: right},
      ]}>
      <MediaSectionFeed
        emptyMessage={t("history.empty.message")}
        emptyTitle={t("history.empty.title")}
        error={error}
        items={data}
        loading={loading}
        onEndReached={fetchMore}
        onRefresh={refresh}
        onRetry={refresh}
        refreshing={refreshing}
        testID={"history-section-feed"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
