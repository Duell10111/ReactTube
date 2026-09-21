import React, {useMemo} from "react";
import {StyleSheet, TVFocusGuideView} from "react-native";

import {HorizontalElementsList} from "@/components/elements/tv/HorizontalElementsList";
import {ElementData, YTVideoInfo as YTVideoInfoType} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import {AppText} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

interface RelatedVideosProps {
  YTVideoInfo: YTVideoInfoType;
  watchNextFeed?: ElementData[];
  fetchMoreNextFeed?: () => void;
  playlistShown: boolean;
}

export function RelatedVideos({
  YTVideoInfo,
  watchNextFeed,
  fetchMoreNextFeed,
  playlistShown,
}: RelatedVideosProps) {
  const {theme} = useAppTheme();
  const {t} = useTranslation();

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
    <>
      <AppText
        style={[
          styles.title,
          {
            paddingStart: theme.spacing.xl,
            paddingBottom: theme.spacing.lg,
          },
        ]}
        variant={"titleMedium"}>
        {t("video.related")}
      </AppText>
      {/* TODO: Replace HorizontalVideoList with HorizontalElementsList once scrolling issue fixed? */}
      <TVFocusGuideView autoFocus>
        <HorizontalElementsList
          elements={elements}
          onEndReached={
            YTVideoInfo.watchNextSections ? undefined : fetchMoreNextFeed
          }
        />
      </TVFocusGuideView>
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    width: "100%",
  },
});
