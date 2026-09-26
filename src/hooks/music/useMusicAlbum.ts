import {useCallback, useEffect, useState} from "react";

import Logger from "../../utils/Logger";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {getElementDataFromYTAlbum} from "@/extraction/YTElements";

const LOGGER = Logger.extend("MUSIC_ALBUM");

export default function useMusicAlbum(albumId: string) {
  const youtube = useYoutubeContext();
  const [album, setAlbum] =
    useState<ReturnType<typeof getElementDataFromYTAlbum>>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  const reload = useCallback(() => {
    if (!youtube?.music) {
      return;
    }
    setLoading(true);
    setError(undefined);
    youtube.music
      .getAlbum(albumId)
      .then(a => {
        setAlbum(getElementDataFromYTAlbum(a, albumId));
      })
      .catch(loadError => {
        setError(loadError);
        LOGGER.warn(loadError);
      })
      .finally(() => setLoading(false));
  }, [youtube, albumId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return {album, loading, error, reload};
}
