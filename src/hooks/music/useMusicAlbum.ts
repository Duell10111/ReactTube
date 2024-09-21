import {useEffect, useState} from "react";

import Logger from "../../utils/Logger";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {getElementDataFromYTAlbum} from "@/extraction/YTElements";

const LOGGER = Logger.extend("MUSIC_ALBUM");

export default function useMusicAlbum(albumId: string) {
  const youtube = useYoutubeContext();
  const [album, setAlbum] =
    useState<ReturnType<typeof getElementDataFromYTAlbum>>();

  useEffect(() => {
    youtube?.music
      ?.getAlbum(albumId)
      .then(a => {
        setAlbum(getElementDataFromYTAlbum(a, albumId));
      })
      .catch(LOGGER.warn);
  }, [youtube, albumId]);

  return {album};
}
