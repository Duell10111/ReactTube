import {useYoutubeContext} from "../context/YoutubeContext";
import {useCallback, useEffect, useState} from "react";
import {YTNodes, YT, Helpers} from "../utils/Youtube";
import Logger from "../utils/Logger";

const LOGGER = Logger.extend("PLAYLIST");

export default function usePlaylistDetails(playlistId: string) {
  const youtube = useYoutubeContext();
  const [playlist, setPlaylist] = useState<YT.Playlist>();
  const [data, setData] = useState<Helpers.YTNode[]>([]);

  useEffect(() => {
    youtube
      ?.getPlaylist(playlistId)
      .then(p => {
        setPlaylist(p);
        // if (p.page_contents.is(YTNodes.SectionList)) {
        //   setData(p.page_contents.contents);
        // } else {
        //   LOGGER.warn("Unknown playlist content type: ", p.page_contents.type);
        // }
        setData(p.items);
      })
      .catch(LOGGER.warn);
  }, [youtube, playlistId]);

  const fetchMore = useCallback(async () => {
    if (playlist?.has_continuation) {
      const update = await playlist.getContinuation();
      setPlaylist(update);
      setData([...data, ...update.items]);
    } else {
      LOGGER.warn("No Continuation available");
    }
  }, [playlist, data]);

  return {playlist, data, fetchMore};
}
