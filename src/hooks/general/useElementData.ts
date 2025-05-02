import {useEffect, useState} from "react";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {ElementData} from "@/extraction/Types";
import {getElementDataFromVideoInfo} from "@/extraction/YTElements";
import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("ELEMENT_DATA");

// Fetcher to add missing data to ElementData
export default function useElementData(data: ElementData) {
  const youtube = useYoutubeContext();
  const [fetchedData, setFetchedData] = useState(data);

  useEffect(() => {
    if (data.type === "video" || data.type === "reel") {
      youtube?.getInfo(data.navEndpoint ?? data.id).then(video => {
        const fData = getElementDataFromVideoInfo(video);

        setFetchedData({
          ...data,
          author:
            data.author?.id && data.author.id.length > 0
              ? data.author
              : fData.author,
        });
      });
    } else if (data.type === "channel") {
      // Currently not needed :)
      // youtube?.getChannel(data.id).then(channel => {
      //   const fData = getElementDataFromYTChannel(channel);
      //
      //   setFetchedData({
      //     ...data,
      //     d
      //   });
      // });
    } else {
      LOGGER.warn(`Unknown Element Data type provided: ${data.type}`);
    }
  }, [data]);

  return fetchedData;
}
