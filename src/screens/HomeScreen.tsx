import {useFocusEffect} from "@react-navigation/native";
import React, {useState} from "react";
import {Platform, TVEventControl} from "react-native";

import useHomeScreen from "@/hooks/tv/useHomeScreen";
import usePhoneOrientationLocker from "@/hooks/ui/usePhoneOrientationLocker";
import {MediaFeed} from "@/ui/patterns";
import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("HOME");

/** Half a day. After that the feed is stale enough to refetch on focus. */
const refreshAfter = 43200000;

// TODO: Do not fetch Home if not logged in?
// Alternative: Show trending screen instead?

export default function HomeScreen() {
  const [fetchDate, setFetchDate] = useState(Date.now());
  const {content, fetchMore, refresh, refreshing, loading, error} =
    useHomeScreen();

  useFocusEffect(() => {
    if (Math.abs(Date.now() - fetchDate) > refreshAfter) {
      LOGGER.debug("Triggering refresh home content");
      refresh();
      setFetchDate(Date.now());
    } else {
      LOGGER.debug("Last fetch has been recently. Skipping refresh");
    }
  });

  useFocusEffect(() => {
    if (Platform.isTV) {
      TVEventControl.disableTVMenuKey();
    }
  });

  usePhoneOrientationLocker();

  return (
    <MediaFeed
      error={error}
      items={content}
      loading={loading}
      onEndReached={fetchMore}
      onRefresh={refresh}
      onRetry={refresh}
      refreshing={refreshing}
      testID={"home-feed"}
    />
  );
}
