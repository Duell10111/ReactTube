import {useCallback, useEffect, useState} from "react";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {YTMusicArtist} from "@/extraction/Types";
import {getElementDataFromYTMusicArtist} from "@/extraction/YTElements";
import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("MUSIC_CHANNEL");

export default function useMusicChannelDetails(artistID: string) {
  const youtube = useYoutubeContext();
  const [artist, setArtist] = useState<YTMusicArtist>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  const reload = useCallback(() => {
    if (!youtube?.music) {
      return;
    }
    setLoading(true);
    setError(undefined);
    youtube.music
      .getArtist(artistID)
      .then(ytArtist => {
        setArtist(getElementDataFromYTMusicArtist(ytArtist, artistID));
      })
      .catch(loadError => {
        setError(loadError);
        LOGGER.warn(loadError);
      })
      .finally(() => setLoading(false));
  }, [artistID, youtube]);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    artist,
    loading,
    error,
    reload,
  };
}
