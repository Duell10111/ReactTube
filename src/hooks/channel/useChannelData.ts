import {useCallback, useEffect, useRef, useState} from "react";

import {
  createChannelFeedLoader,
  type ChannelFeedState,
} from "./channelFeedLoader";

import type {TVChannelTab} from "@/components/channel/tv/channelModel";
import {parseArrayHorizontalAndElement} from "@/extraction/ArrayExtraction";
import type {FeedItem} from "@/ui/patterns/feedLayout";
import {YT, YTNodes} from "@/utils/Youtube";

export type ChannelContentTypes = Exclude<TVChannelTab, "About">;

export default function useChannelData(
  channel: YT.Channel,
  type: ChannelContentTypes,
) {
  const [state, setState] = useState<ChannelFeedState<FeedItem>>({
    items: [],
    loading: true,
  });
  const loaderRef = useRef<
    | ReturnType<
        typeof createChannelFeedLoader<
          YT.Channel | YT.ChannelListContinuation,
          FeedItem
        >
      >
    | undefined
  >(undefined);
  useEffect(() => {
    const loader = createChannelFeedLoader<
      YT.Channel | YT.ChannelListContinuation,
      FeedItem
    >({
      firstPage: () => {
        switch (type) {
          case "Home":
            return channel.getHome();
          case "Videos":
            return channel.getVideos();
          case "Reels":
            return channel.getShorts();
          case "Live":
            return channel.getLiveStreams();
          case "Playlists":
            return channel.getPlaylists();
        }
      },
      nextPage: page =>
        page.has_continuation
          ? page.getContinuation()
          : Promise.resolve(undefined),
      extract: page => {
        if (type === "Home") {
          const content = page.page_contents;
          if (content?.is(YTNodes.SectionList, YTNodes.RichGrid)) {
            return parseArrayHorizontalAndElement(content.contents);
          }
        }
        return parseArrayHorizontalAndElement(
          type === "Playlists" ? page.playlists : page.videos,
        );
      },
      onChange: setState,
    });
    loaderRef.current = loader;
    loader.refresh();
    return () => loader.dispose();
  }, [channel, type]);

  const fetchMore = useCallback(() => loaderRef.current?.fetchMore(), []);
  const refresh = useCallback(() => loaderRef.current?.refresh(), []);
  return {...state, fetchMore, refresh};
}
