import _ from "lodash";
import {useEffect, useState} from "react";

import {YTNodes, YTShorts, Helpers} from "../../utils/Youtube";

import {useYoutubeContext} from "@/context/YoutubeContext";

export function useReelPlaylist(reelId?: string) {
  const youtube = useYoutubeContext();
  const [shortItem, setShortItem] = useState<YTShorts.ShortFormVideoInfo>();

  const [elements, setElements] =
    useState<(string | YTNodes.NavigationEndpoint)[]>();

  useEffect(() => {
    if (!reelId) {
      return;
    }

    youtube
      ?.getShortsVideoInfo(reelId)
      .then(item => {
        setShortItem(item);
        const data = item.watch_next_feed;
        setElements([...(elements ?? []), ...data]);
      })
      .catch(console.warn);
  }, [reelId, youtube]);

  console.log("Elements: ", JSON.stringify(elements));

  const fetchMore = () => {
    shortItem
      ?.getWatchNextContinuation()
      .then(item => {
        setShortItem(item);
        const data = item.watch_next_feed;
        setElements([...(elements ?? []), ...data]);
      })
      .catch(console.warn);
  };

  return {elements, fetchMore};
}

// TODO: Currently not needed?
// function extractVideoIds(arr?: Helpers.ObservedArray) {
//   const data =
//     arr?.map(v => {
//       return v.as(YTNodes.Command)?.endpoint?.payload?.videoId as
//         | string
//         | undefined;
//     }) ?? [];
//   return _.compact(data);
// }
