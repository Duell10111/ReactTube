import {useCallback} from "react";

import {YTNodes} from "../../utils/Youtube";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {getTrackInfoForVideo} from "@/downloader/DBData";
import {VideoData, YTTrackInfo} from "@/extraction/Types";
import {getElementDataFromTrackInfo} from "@/extraction/YTElements";

export default function useVideoDataGenerator() {
  const youtube = useYoutubeContext();

  const videoExtractor = useCallback(
    async (videoData: VideoData) => {
      // console.log("VideoExtractor", videoData);
      // TODO: Check if navEndpoint contains at least a videoId as browseId only does not work. :/
      // const useNav =
      //   videoData.navEndpoint && videoData.navEndpoint?.payload?.videoId;
      // TODO: Check if localData in DB available?
      let element: YTTrackInfo;
      const localData = await getTrackInfoForVideo(videoData.id);
      if (
        localData &&
        localData.originalData.streaming_data?.hls_manifest_url
      ) {
        element = localData;
      } else {
        const [info, classicInfo] = await Promise.all([
          youtube!.music.getInfo(videoData.navEndpoint ?? videoData.id),
          youtube!.getInfo(videoData.navEndpoint ?? videoData.id, {
            client: "IOS",
          }),
        ]);
        // Patch YT Music StreamingData
        info.streaming_data = classicInfo.streaming_data;
        element = getElementDataFromTrackInfo(info);
      }

      // Set Local Playlist ID if a local element called
      element.localPlaylistId = videoData.localPlaylistId;

      // Check if bot detection is active
      if (
        element.originalData.playability_status?.status === "LOGIN_REQUIRED"
      ) {
        throw Error(
          `Login Required: ${element.originalData.playability_status?.reason}`,
        );
      }

      return element;
    },
    [youtube],
  );

  const videoExtractorNavigationEndpoint = useCallback(
    async (navigationEndpoint: YTNodes.NavigationEndpoint) => {
      console.log("videoExtractorNavigationEndpoint");
      const [info, classicInfo] = await Promise.all([
        youtube!.music.getInfo(navigationEndpoint),
        youtube!.getInfo(navigationEndpoint, {client: "IOS"}),
      ]);
      // Patch YT Music StreamingData
      info.streaming_data = classicInfo.streaming_data;

      return getElementDataFromTrackInfo(info);
    },
    [youtube],
  );

  return {videoExtractor, videoExtractorNavigationEndpoint};
}
