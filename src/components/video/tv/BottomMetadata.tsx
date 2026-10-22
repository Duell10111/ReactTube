import React, {useMemo} from "react";
import {ScrollView, View} from "react-native";

import {RelatedVideos} from "@/components/video/tv/RelatedVideos";
import {VideoChapterList} from "@/components/video/tv/VideoChapterList";
import {VideoPlaylistList} from "@/components/video/tv/VideoPlaylistList";
import {resolveVideoPlaylist} from "@/components/video/tv/playlistModel";
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

  const playlist = useMemo(
    () => resolveVideoPlaylist(YTVideoInfo, t("video.playlist")),
    [YTVideoInfo, t],
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
          currentIndex={playlist.currentIndex}
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
