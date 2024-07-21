import {useCallback, useEffect, useMemo, useRef, useState} from "react";

import {useYoutubeContext} from "../../context/YoutubeContext";
import {getElementDataFromYTMusicPlaylist} from "../../extraction/YTElements";
import Logger from "../../utils/Logger";

const LOGGER = Logger.extend("PLAYLIST");

export default function usePlaylistDetails(playlistId: string) {
  const youtube = useYoutubeContext();
  const [playlist, setPlaylist] =
    useState<ReturnType<typeof getElementDataFromYTMusicPlaylist>>();

  useEffect(() => {
    youtube?.music
      ?.getPlaylist(playlistId)
      .then(p => {
        setPlaylist(getElementDataFromYTMusicPlaylist(p));
      })
      .catch(LOGGER.warn);
  }, [youtube, playlistId]);

  // const fetchMore = useCallback(async () => {
  //   if (playlist?.current) {
  //     const update = await playlist.getContinuation();
  //     setPlaylist(update);
  //     setData([...data, ...update.items]);
  //   } else {
  //     LOGGER.warn("No Continuation available");
  //   }
  // }, [playlist, data]);

  return {playlist};
}
