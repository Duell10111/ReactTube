import {useEffect, useRef, useState} from "react";

import {useYoutubeTVContext} from "@/context/YoutubeContext";
import {parseArray} from "@/extraction/ArrayExtraction";
import {ElementData} from "@/extraction/Types";
import {YTTV} from "@/utils/Youtube";

export default function usePlaylists() {
  const youtube = useYoutubeTVContext();
  const playlistFeed = useRef<YTTV.PlaylistsFeed>(undefined);
  const [data, setData] = useState<ElementData[]>();

  useEffect(() => {
    youtube?.tv.getPlaylists().then(feed => {
      playlistFeed.current = feed;
      feed.contents && setData(parseArray(feed.contents));
    });
  }, []);

  const fetchMore = () => {
    if (playlistFeed.current?.has_continuation) {
      playlistFeed.current.getContinuation().then(continuation => {
        playlistFeed.current = continuation;
        continuation.contents && setData(parseArray(continuation.contents));
      });
    }
  };

  return {data, fetchMore};
}
