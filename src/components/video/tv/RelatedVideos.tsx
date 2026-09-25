import React, {useMemo} from "react";
import {StyleSheet, View} from "react-native";

import {ElementData, YTVideoInfo as YTVideoInfoType} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import {AppText} from "@/ui/components";
import {MediaCardRow, getFeedRowPadding, useFeedGeometry} from "@/ui/patterns";
import {useAppTheme} from "@/ui/theme";

interface RelatedVideosProps {
  YTVideoInfo: YTVideoInfoType;
  watchNextFeed?: ElementData[];
  fetchMoreNextFeed?: () => void;
  playlistShown: boolean;
}

/**
 * Related videos under the player. It renders the same media cards the feeds
 * and the search results do, from the same geometry, so a video looks the same
 * here as it does everywhere else in the app.
 */
export function RelatedVideos({
  YTVideoInfo,
  watchNextFeed,
  fetchMoreNextFeed,
  playlistShown,
}: RelatedVideosProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const {metrics, contentPadding} = useFeedGeometry();

  const padding = useMemo(
    () => getFeedRowPadding(contentPadding, theme.spacing.sm),
    [contentPadding, theme.spacing.sm],
  );

  const elements = useMemo(
    () =>
      YTVideoInfo.watchNextSections
        ? YTVideoInfo.watchNextSections
            .slice(playlistShown ? 1 : 0)
            .flatMap(section => section.parsedData)
        : (watchNextFeed ?? []),
    [YTVideoInfo.watchNextSections, playlistShown, watchNextFeed],
  );

  return (
    <View style={[styles.container, {gap: theme.spacing.sm}]}>
      <View style={padding}>
        <AppText accessibilityRole={"header"} variant={"titleMedium"}>
          {t("video.related")}
        </AppText>
      </View>
      <MediaCardRow
        elements={elements}
        metrics={metrics}
        // The sections come complete; only the flat feed pages.
        onEndReached={
          YTVideoInfo.watchNextSections ? undefined : fetchMoreNextFeed
        }
        padding={padding}
        testID={"related-videos"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
});
