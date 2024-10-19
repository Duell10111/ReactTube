import {useEffect, useMemo, useState} from "react";

import Logger from "../utils/Logger";
import {YT} from "../utils/Youtube";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {getElementDataFromYTChannel} from "@/extraction/YTElements";

const LOGGER = Logger.extend("CHANNEL");

export default function useChannelDetails(channelID: string) {
  const innerTube = useYoutubeContext();
  const [channel, setChannel] = useState<YT.Channel>();

  const parsedChannel = useMemo(
    () => (channel ? getElementDataFromYTChannel(channel) : undefined),
    [channel],
  );

  useEffect(() => {
    if (!innerTube) {
      LOGGER.warn("No Youtube Context available");
      return;
    }

    if (!channelID) {
      return;
    }

    innerTube
      .getChannel(channelID)
      .then(data => {
        setChannel(data);
      })
      .catch(LOGGER.warn);
  }, [innerTube, channelID]);

  return {channel, parsedChannel};
}
