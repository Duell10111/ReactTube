import {useEffect, useMemo, useState} from "react";

import {useYoutubeContext} from "../../context/YoutubeContext";
import {getElementDataFromVideoInfo} from "../../extraction/YTElements";
import Logger from "../../utils/Logger";
import {YT, YTNodes} from "../../utils/Youtube";

const LOGGER = Logger.extend("VIDEO");

export default function useVideoElementData(
  video: string | YTNodes.NavigationEndpoint | undefined,
) {
  const youtube = useYoutubeContext();
  const [Video, setVideo] = useState<YT.VideoInfo>();

  useEffect(() => {
    video && youtube?.getInfo(video).then(setVideo).catch(LOGGER.warn);
  }, [youtube, video]);

  const videoElement = useMemo(
    () => (Video ? getElementDataFromVideoInfo(Video) : undefined),
    [Video],
  );

  return {
    Video,
    videoElement,
  };
}
