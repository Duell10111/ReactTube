import {useEffect, useState} from "react";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {YTMusicArtist} from "@/extraction/Types";
import {getElementDataFromYTMusicArtist} from "@/extraction/YTElements";
import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("MUSIC_CHANNEL");

export default function useMusicChannelDetails(artistID: string) {
  const youtube = useYoutubeContext();
  const [artist, setArtist] = useState<YTMusicArtist>();

  useEffect(() => {
    youtube?.music
      .getArtist(artistID)
      .then(ytArtist => {
        setArtist(getElementDataFromYTMusicArtist(ytArtist, artistID));
      })
      .catch(LOGGER.warn);
  }, [artistID]);

  return {
    artist,
  };
}
