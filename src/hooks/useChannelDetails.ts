import {useYoutubeContext} from "../context/YoutubeContext";
import {useEffect, useMemo, useState} from "react";
import {YT, YTNodes} from "../utils/Youtube";
import Logger from "../utils/Logger";

const LOGGER = Logger.extend("CHANNEL");

export default function useChannelDetails(channelID: string) {
  const innerTube = useYoutubeContext();
  const [channel, setChannel] = useState<YT.Channel>();

  useEffect(() => {
    if (!innerTube) {
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

  const channelData = useMemo(() => {
    const data = channel?.page_contents;
    if (data?.is(YTNodes.SectionList)) {
      return data.contents;
    } else {
      LOGGER.warn("Unknown type: ", data?.type);
      return undefined;
    }
  }, [channel]);

  return {channel, channelData: []};
}
