import {useCallback} from "react";

import {YTNodes} from "../../utils/Youtube";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {VideoData} from "@/extraction/Types";
import {getElementDataFromVideoInfo} from "@/extraction/YTElements";

export default function useVideoDataGenerator() {
  const youtube = useYoutubeContext();

  const videoExtractor = useCallback(
    async (videoData: VideoData) => {
      const info = await youtube.getInfo(
        videoData.navEndpoint ?? videoData.id,
        "IOS",
      );

      return getElementDataFromVideoInfo(info);
    },
    [youtube],
  );

  const videoExtractorNavigationEndpoint = useCallback(
    async (navigationEndpoint: YTNodes.NavigationEndpoint) => {
      const info = await youtube.getInfo(navigationEndpoint, "IOS");

      return getElementDataFromVideoInfo(info);
    },
    [youtube],
  );

  return {videoExtractor, videoExtractorNavigationEndpoint};
}
