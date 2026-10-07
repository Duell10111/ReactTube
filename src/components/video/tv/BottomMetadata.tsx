import React, {useMemo} from "react";
import {ScrollView, View} from "react-native";

import {RelatedVideos} from "@/components/video/tv/RelatedVideos";
import {VideoChapterList} from "@/components/video/tv/VideoChapterList";
import {VideoPlaylistList} from "@/components/video/tv/VideoPlaylistList";
import {findCurrentPlaylistIndex} from "@/components/video/tv/playlistModel";
import {ElementData, YTVideoInfo as YTVideoInfoType} from "@/extraction/Types";
import {useTranslation} from "@/localization";

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
  const {t} = useTranslation();

  const playlist = useMemo(() => {
    if (YTVideoInfo.watchNextSections?.[0] && YTVideoInfo.playlist) {
      return {
        title: YTVideoInfo.watchNextSections[0].title ?? t("video.playlist"),
        elements: YTVideoInfo.watchNextSections[0].parsedData,
      };
    } else if (YTVideoInfo.playlist) {
      return {
        title: YTVideoInfo.playlist.title,
        elements: YTVideoInfo.playlist.content,
      };
    }
  }, [YTVideoInfo, t]);

  const currentPlaylistIndex = useMemo(
    () =>
      playlist
        ? findCurrentPlaylistIndex(
            playlist.elements,
            YTVideoInfo.id,
            YTVideoInfo.playlist?.current_index,
          )
        : -1,
    [playlist, YTVideoInfo.id, YTVideoInfo.playlist?.current_index],
  );

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
      {playlist ? (
        <VideoPlaylistList
          currentIndex={currentPlaylistIndex}
          playlist={playlist}
        />
      ) : null}
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
