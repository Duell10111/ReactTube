import {useCallback} from "react";

import {YTNodes} from "../../utils/Youtube";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {VideoData} from "@/extraction/Types";
import {getElementDataFromTrackInfo} from "@/extraction/YTElements";

export default function useVideoDataGenerator() {
  const youtube = useYoutubeContext();

  const videoExtractor = useCallback(
    async (videoData: VideoData) => {
      console.log("VideoExtractor", videoData);
      // TODO: Check if navEndpoint contains at least a videoId as browseId only does not work. :/
      // const useNav =
      //   videoData.navEndpoint && videoData.navEndpoint?.payload?.videoId;
      const [info, classicInfo] = await Promise.all([
        youtube!.music.getInfo(videoData.navEndpoint ?? videoData.id),
        youtube!.getInfo(videoData.navEndpoint ?? videoData.id, "IOS"),
      ]);
      // Patch YT Music StreamingData
      info.streaming_data = classicInfo.streaming_data;

      // Set Local Playlist ID if a local element called
      const element = getElementDataFromTrackInfo(info);
      element.localPlaylistId = videoData.localPlaylistId;
      return element;
    },
    [youtube],
  );

  const videoExtractorNavigationEndpoint = useCallback(
    async (navigationEndpoint: YTNodes.NavigationEndpoint) => {
      console.log("videoExtractorNavigationEndpoint");
      const [info, classicInfo] = await Promise.all([
        youtube!.music.getInfo(navigationEndpoint),
        youtube!.getInfo(navigationEndpoint, "IOS"),
      ]);
      // Patch YT Music StreamingData
      info.streaming_data = classicInfo.streaming_data;

      return getElementDataFromTrackInfo(info);
    },
    [youtube],
  );

  return {videoExtractor, videoExtractorNavigationEndpoint};
}
