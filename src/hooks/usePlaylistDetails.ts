import {useCallback, useEffect, useMemo, useState} from "react";

import {useYoutubeContext} from "../context/YoutubeContext";
import {getVideoData} from "../extraction/ElementData";
import Logger from "../utils/Logger";
import {YTNodes, YT} from "../utils/Youtube";

type PlaylistItems =
  | YTNodes.Video
  | YTNodes.CompactVideo
  | YTNodes.GridVideo
  | YTNodes.PlaylistPanelVideo
  | YTNodes.PlaylistVideo
  | YTNodes.ReelItem
  | YTNodes.WatchCardCompactVideo;

const LOGGER = Logger.extend("PLAYLIST");

export default function usePlaylistDetails(playlistId: string) {
  const youtube = useYoutubeContext();
  const [playlist, setPlaylist] = useState<YT.Playlist>();
  const [data, setData] = useState<PlaylistItems[]>([]);

  useEffect(() => {
    youtube
      ?.getPlaylist(playlistId)
      .then(p => {
        setPlaylist(p);
        setData(p.items);
      })
      .catch(LOGGER.warn);
  }, [youtube, playlistId]);

  const parsedData = useMemo(() => {
    return data.map(getVideoData);
  }, [data]);

  const fetchMore = useCallback(async () => {
    if (playlist?.has_continuation) {
      const update = await playlist.getContinuation();
      setPlaylist(update);
      setData([...data, ...update.items]);
    } else {
      LOGGER.warn("No Continuation available");
    }
  }, [playlist, data]);

  return {playlist, data, parsedData, fetchMore};
}
