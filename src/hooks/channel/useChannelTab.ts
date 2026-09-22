import {useCallback, useEffect, useRef, useState} from "react";

import {parseArray} from "@/extraction/ArrayExtraction";
import {extractPageContent} from "@/extraction/ContentExtraction";
import {HorizontalData} from "@/extraction/ShelfExtraction";
import {ElementData, YTChannel} from "@/extraction/Types";
import Logger from "@/utils/Logger";
import {YT} from "@/utils/Youtube";

export type ChannelTabType =
  | "Home"
  | "Videos"
  | "Shorts"
  | "Playlists"
  | "About";

const LOGGER = Logger.extend("CHANNEL");

export default function useChannelTab(
  channel: YTChannel,
  type: ChannelTabType,
) {
  const channelContinuation = useRef<YT.Channel | YT.ChannelListContinuation>(
    undefined,
  );
  const [data, setData] = useState<(HorizontalData | ElementData)[]>();
  const [loading, setLoading] = useState(type !== "About");
  const [error, setError] = useState<unknown>();

  const updateData = useCallback(
    (
      tab: YT.Channel | YT.ChannelListContinuation,
      expandExistingData?: boolean,
    ) => {
      let elements: (HorizontalData | ElementData)[] = [];
      if (type === "Videos" || type === "Shorts") {
        elements = parseArray(tab.videos);
      } else if (type === "Playlists") {
        elements = parseArray(tab.playlists);
      } else {
        const extraction = extractPageContent(tab.page_contents);
        if (extraction) {
          elements = extraction.items;
        }
      }

      if (elements.length > 0) {
        setData(previous =>
          expandExistingData ? [...(previous ?? []), ...elements] : elements,
        );
      } else if (!expandExistingData) {
        setData([]);
      }
    },
    [type],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    channelContinuation.current = undefined;

    let request: Promise<YT.Channel> | undefined;
    switch (type) {
      case "Home":
        if (channel.originalData.has_home) {
          request = channel.originalData.getHome();
        }
        break;
      case "Videos":
        if (channel.originalData.has_videos) {
          request = channel.originalData.getVideos();
        }
        break;
      case "Shorts":
        if (channel.originalData.has_shorts) {
          request = channel.originalData.getShorts();
        }
        break;
      case "Playlists":
        if (channel.originalData.has_playlists) {
          request = channel.originalData.getPlaylists();
        }
        break;
      case "About":
        setData([]);
        setLoading(false);
        return;
    }

    if (!request) {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      const tab = await request;
      channelContinuation.current = tab;
      updateData(tab);
    } catch (loadError) {
      setError(loadError);
      LOGGER.warn(loadError);
    } finally {
      setLoading(false);
    }
  }, [channel, type, updateData]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const fetchMore = useCallback(async () => {
    const continuation = await channelContinuation.current?.getContinuation();
    if (continuation) {
      channelContinuation.current = continuation;
      updateData(continuation, true);
    }
  }, [updateData]);

  return {data, fetchMore, loading, error, refresh};
}
