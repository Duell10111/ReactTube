import {useCallback, useEffect, useMemo, useState} from "react";

import Logger from "../utils/Logger";
import {YT} from "../utils/Youtube";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {getElementDataFromYTChannel} from "@/extraction/YTElements";

const LOGGER = Logger.extend("CHANNEL");

export default function useChannelDetails(channelID: string) {
  const innerTube = useYoutubeContext();
  const [channel, setChannel] = useState<YT.Channel>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  const parsedChannel = useMemo(
    () => (channel ? getElementDataFromYTChannel(channel) : undefined),
    [channel],
  );

  const load = useCallback(() => {
    if (!innerTube) {
      return;
    }

    if (!channelID) {
      return;
    }

    setLoading(true);
    setError(undefined);
    innerTube
      .getChannel(channelID)
      .then(data => {
        setChannel(data);
      })
      .catch(loadError => {
        setError(loadError);
        LOGGER.warn(loadError);
      })
      .finally(() => setLoading(false));
  }, [innerTube, channelID]);

  useEffect(() => {
    load();
  }, [load]);

  return {channel, parsedChannel, loading, error, reload: load};
}
