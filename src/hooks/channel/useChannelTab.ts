import {useEffect, useRef, useState} from "react";

import {parseArray} from "@/extraction/ArrayExtraction";
import {extractPageContent} from "@/extraction/ContentExtraction";
import {HorizontalData} from "@/extraction/ShelfExtraction";
import {ElementData, YTChannel} from "@/extraction/Types";
import {getElementDataFromYTChannel} from "@/extraction/YTElements";
import Logger from "@/utils/Logger";
import {YT} from "@/utils/Youtube";

export type ChannelTabType = "Home" | "Videos" | "Shorts" | "Playlists";

const LOGGER = Logger.extend("CHANNEL");

export default function useChannelTab(
  channel: YTChannel,
  type: ChannelTabType,
) {
  const channelRef = useRef<YTChannel>(undefined);
  const channelContinuation = useRef<YT.Channel | YT.ChannelListContinuation>(
    undefined,
  );
  const [data, setData] = useState<(HorizontalData | ElementData)[]>();

  // console.log("ChannelTab", channel.originalData.getTabByURL);

  const updateData = (
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
      setData(expandExistingData ? [...(data ?? []), ...elements] : elements);
    }
  };

  useEffect(() => {
    let fetchFkt: string;
    switch (type) {
      case "Home":
        if (channel.originalData.has_home) {
          fetchFkt = "getHome";
        }
        break;
      case "Videos":
        if (channel.originalData.has_videos) {
          fetchFkt = "getVideos";
        }
        break;
      case "Shorts":
        if (channel.originalData.has_shorts) {
          fetchFkt = "getShorts";
        }
        break;
      case "Playlists":
        if (channel.originalData.has_playlists) {
          fetchFkt = "getPlaylists";
        }
        break;
    }

    console.log("Type: ", type);

    channel.originalData
      .getHome()
      .then(() => {
        console.log("FETCHED");
      })
      .catch(error => console.warn("ERROR: ", error));

    // @ts-ignore TODO: fix
    if (fetchFkt) {
      channel.originalData[fetchFkt]()
        .then((tab: YT.Channel) => {
          channelRef.current = getElementDataFromYTChannel(tab);
          channelContinuation.current = tab;
          console.log("Fetched channel tab: ", tab);
          console.log("Fetched channel tab content: ", tab.page_contents);
          updateData(tab);
        })
        .catch(error => LOGGER.warn("ERROR: ", error));
    } else {
      LOGGER.warn(`Channel Tab Type '${type}' not supported or not available.`);
    }
  }, []);

  const fetchMore = async () => {
    console.log("FetchMore");
    const continuation = await channelContinuation.current?.getContinuation();
    if (continuation) {
      channelContinuation.current = continuation;
      updateData(continuation, true);
    } else {
      LOGGER.warn("ERROR: No continuation retrieved for channel tab.");
    }
  };

  return {data, fetchMore};
}
