import {YT} from "../../utils/Youtube";
import {useEffect, useMemo, useState} from "react";
import Logger from "../../utils/Logger";

const LOGGER = Logger.extend("CHANNEL");

export type ChannelContentTypes = "Home" | "Videos" | "Playlists" | "Search";

export default function useChannelData(
  channel: YT.Channel,
  type: ChannelContentTypes,
) {
  const [data, setData] = useState<YT.Channel>();

  useEffect(() => {
    if (type === "Home") {
      channel.getHome().then(setData).catch(LOGGER.warn);
    }
  }, [channel, type]);

  LOGGER.debug("Data: ", JSON.stringify(channel.page_contents.type, null, 4));

  return {data};
}
