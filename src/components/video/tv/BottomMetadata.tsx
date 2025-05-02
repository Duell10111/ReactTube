import React, {useMemo} from "react";
import {ScrollView, View} from "react-native";

import {RelatedVideos} from "@/components/video/tv/RelatedVideos";
import {VideoChapterList} from "@/components/video/tv/VideoChapterList";
import {VideoPlaylistList} from "@/components/video/tv/VideoPlaylistList";
import {ElementData, YTVideoInfo as YTVideoInfoType} from "@/extraction/Types";

interface BottomMetadataProps {
  YTVideoInfo: YTVideoInfoType;
  watchNextFeed?: ElementData[];
  fetchMoreNextFeed?: () => void;
  seek?: (seconds: number) => void;
}

export function BottomMetadata({
  YTVideoInfo,
  watchNextFeed,
  fetchMoreNextFeed,
  seek,
}: BottomMetadataProps) {
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

  const Node =
    (YTVideoInfo.chapters && YTVideoInfo.chapters.length > 0) || playlist
      ? BottomScrollView
      : View;

  return (
    <Node>
      {YTVideoInfo.chapters && YTVideoInfo.chapters.length > 0 ? (
        <VideoChapterList
          chapters={YTVideoInfo.chapters}
          onPress={chapter => {
            seek?.(chapter.startDuration);
          }}
        />
      ) : null}
      {playlist ? <VideoPlaylistList playlist={playlist} /> : null}
      <RelatedVideos
        YTVideoInfo={YTVideoInfo}
        watchNextFeed={watchNextFeed}
        fetchMoreNextFeed={fetchMoreNextFeed}
        playlistShown={playlist !== undefined}
      />
    </Node>
  );
}

interface BottomScrollViewProps {
  children: React.ReactNode;
}

function BottomScrollView({children}: BottomScrollViewProps) {
  return <ScrollView pagingEnabled>{children}</ScrollView>;
}
