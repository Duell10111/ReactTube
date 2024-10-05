import {useCallback, useEffect, useState} from "react";

import Logger from "../utils/Logger";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {parseObservedArray} from "@/extraction/ArrayExtraction";
import {ElementData, YTPlaylist} from "@/extraction/Types";
import {getElementDataFromYTPlaylist} from "@/extraction/YTElements";

const LOGGER = Logger.extend("PLAYLIST");

export default function usePlaylistDetails(playlistId: string) {
  const youtube = useYoutubeContext();
  const [playlist, setPlaylist] = useState<YTPlaylist>();
  const [data, setData] = useState<ElementData[]>([]);

  useEffect(() => {
    youtube
      ?.getPlaylist(playlistId)
      .then(p => {
        setPlaylist(getElementDataFromYTPlaylist(p));
        setData(parseObservedArray(p.items));
      })
      .catch(LOGGER.warn);
  }, [youtube, playlistId]);

  // const parsedData = useMemo(() => {
  //   return data.map(getVideoData);
  // }, [data]);

  const fetchMore = useCallback(async () => {
    if (playlist?.originalData.has_continuation) {
      const update = await playlist.originalData.getContinuation();
      setPlaylist(getElementDataFromYTPlaylist(update));
      setData([...data, ...parseObservedArray(update.items)]);
    } else {
      LOGGER.warn("No Continuation available");
    }
  }, [playlist, data]);

  console.log("Playlist data: ", data);

  return {playlist, data, fetchMore};
}
