import React, {useMemo} from "react";
import {StyleSheet, Text, TVFocusGuideView, View} from "react-native";

import {HorizontalElementsList} from "@/components/elements/tv/HorizontalElementsList";
import {ElementData, YTVideoInfo as YTVideoInfoType} from "@/extraction/Types";

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
  return (
    <>
      <Text style={styles.bottomText}>{"Related Videos"}</Text>
      {/* TODO: Replace HorizontalVideoList with HorizontalElementsList once scrolling issue fixed? */}
      <TVFocusGuideView autoFocus>
        {useMemo(
          () =>
            YTVideoInfo.watchNextSections ? (
              // TODO: Show sections vertical and remove workaround?
              <HorizontalElementsList
                elements={YTVideoInfo.watchNextSections
                  .slice(playlistShown ? 1 : 0)
                  .flatMap(section => section.parsedData)}
                // textStyle={styles.text}
                // videoSegmentStyle={{marginHorizontal: 20}}
                // containerStyle={{marginBottom: 20}}
              />
            ) : (
              <HorizontalElementsList
                elements={watchNextFeed ?? []}
                // textStyle={styles.text}
                // videoSegmentStyle={{marginHorizontal: 20}}
                onEndReached={fetchMoreNextFeed}
                // containerStyle={{marginBottom: 20}}
              />
            ),
          [YTVideoInfo.watchNextSections, playlistShown],
        )}
      </TVFocusGuideView>
    </>
  );
}

const styles = StyleSheet.create({
  text: {
    color: "white",
  },
  bottomText: {
    fontSize: 25,
    fontWeight: "bold",
    color: "white",
    paddingStart: 20,
    paddingBottom: 15,
  },
  bottomPlaylistTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingStart: 20,
    paddingBottom: 15,
  },
  bottomPlaylistText: {
    fontSize: 25,
    fontWeight: "bold",
    color: "white",
    paddingStart: 10,
  },
});
