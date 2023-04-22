import {useYoutubeContext} from "../context/YoutubeContext";
import {useEffect, useState} from "react";
import {YT} from "../utils/Youtube";
import Logger from "../utils/Logger";

const LOGGER = Logger.extend("CHANNEL");

export default function useChannelDetails(channelID: string) {
  const innerTube = useYoutubeContext();
  const [channel, setChannel] = useState<YT.Channel>();

  useEffect(() => {
    if (!innerTube) {
      LOGGER.warn("No Youtube Context available");
      return;
    }

    innerTube
      .getChannel(channelID)
      .then(data => {
        setChannel(data);
        // LOGGER.debug("Tab: ", JSON.stringify(data.current_tab, null, 4));
        // data.getVideos().then(setChannel).catch(LOGGER.warn);
      })
      .catch(LOGGER.warn);
  }, [innerTube, channelID]);

  return {channel};
}
