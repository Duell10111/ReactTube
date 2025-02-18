import {Icon} from "@rneui/base";
import React, {useMemo} from "react";
import {StyleSheet, Text, View} from "react-native";

import HorizontalVideoList from "@/components/HorizontalVideoList";
import {ElementData, YTVideoInfo as YTVideoInfoType} from "@/extraction/Types";

interface RelatedVideosProps {
  YTVideoInfo: YTVideoInfoType;
  watchNextFeed?: ElementData[];
  fetchMoreNextFeed?: () => void;
}

export function RelatedVideos({
  YTVideoInfo,
  watchNextFeed,
  fetchMoreNextFeed,
}: RelatedVideosProps) {
  const playlist = useMemo(() => {
    if (YTVideoInfo.watchNextSections?.[0] && YTVideoInfo.playlist) {
      return {
        title: YTVideoInfo.watchNextSections[0].title ?? "Playlist",
        elements: YTVideoInfo.watchNextSections[0].parsedData,
      };
    } else if (YTVideoInfo.playlist) {
      return {
        title: YTVideoInfo.playlist.title,
        elements: YTVideoInfo.playlist.content,
      };
    }
  }, [YTVideoInfo]);

  return (
    <>
      {playlist ? (
        <>
          <View style={styles.bottomPlaylistTextContainer}>
            <Icon name={"book"} color={"white"} />
            <Text style={styles.bottomPlaylistText}>{playlist.title}</Text>
          </View>
          <HorizontalVideoList
            nodes={playlist.elements}
            textStyle={styles.text}
          />
        </>
      ) : null}
      <Text style={styles.bottomText}>{"Related Videos"}</Text>
      {/* TODO: Replace HorizontalVideoList with HorizontalElementsList once scrolling issue fixed? */}
      {useMemo(
        () =>
          YTVideoInfo.watchNextSections ? (
            // TODO: Show sections vertical and remove workaround?
            <HorizontalVideoList
              nodes={YTVideoInfo.watchNextSections
                .slice(playlist ? 1 : 0)
                .flatMap(section => section.parsedData)}
              textStyle={styles.text}
              videoSegmentStyle={{marginHorizontal: 20}}
              // containerStyle={{marginBottom: 20}}
            />
          ) : (
            <HorizontalVideoList
              nodes={watchNextFeed ?? []}
              textStyle={styles.text}
              videoSegmentStyle={{marginHorizontal: 20}}
              onEndReached={fetchMoreNextFeed}
              // containerStyle={{marginBottom: 20}}
            />
          ),
        [YTVideoInfo.watchNextSections],
      )}
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
