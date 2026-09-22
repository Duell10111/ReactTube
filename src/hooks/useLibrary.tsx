import {useCallback, useEffect, useRef, useState} from "react";

import Logger from "../utils/Logger";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {YTLibrary} from "@/extraction/Types";
import {getElementDataFromYTLibrary} from "@/extraction/YTElements";
import {YT} from "@/utils/Youtube";

const LOGGER = Logger.extend("LIBRARY");

export default function useLibrary() {
  const youtube = useYoutubeContext();
  const library = useRef<YT.Library>(undefined);
  const [data, setData] = useState<YTLibrary>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  const reload = useCallback(() => {
    if (!youtube) {
      return;
    }
    setLoading(true);
    setError(undefined);
    youtube
      .getLibrary()
      .then(async lib => {
        library.current = lib;
        setData(await getElementDataFromYTLibrary(lib));
      })
      .catch(loadError => {
        setError(loadError);
        LOGGER.warn(loadError);
      })
      .finally(() => setLoading(false));
  }, [youtube]);

  useEffect(() => {
    reload();
  }, [reload]);

  return {data, loading, error, reload};
}
