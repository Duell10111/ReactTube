import React from "react";

import {RelatedVideos} from "@/components/video/tv/RelatedVideos";
import {VideoChapterList} from "@/components/video/tv/VideoChapterList";
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
  return (
    <>
      {YTVideoInfo.chapters && YTVideoInfo.chapters.length > 0 ? (
        <VideoChapterList
          chapters={YTVideoInfo.chapters}
          onPress={chapter => {
            seek?.(chapter.startDuration);
          }}
        />
      ) : null}
      <RelatedVideos
        YTVideoInfo={YTVideoInfo}
        watchNextFeed={watchNextFeed}
        fetchMoreNextFeed={fetchMoreNextFeed}
      />
    </>
  );
}
