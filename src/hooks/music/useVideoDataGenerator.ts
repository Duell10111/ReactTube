import {useCallback} from "react";

import {YTNodes} from "../../utils/Youtube";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {getTrackInfoForVideo} from "@/downloader/DBData";
import {VideoData, YTTrackInfo} from "@/extraction/Types";
import {getElementDataFromTrackInfo} from "@/extraction/YTElements";
import {resetRejectedPlaybackSession} from "@/utils/PlaybackResolver";
import {resolveAudioStreamingSource} from "@/utils/music/AudioPlaybackSource";

export default function useVideoDataGenerator() {
  const youtube = useYoutubeContext();

  const resolveTrack = useCallback(
    async (
      target: string | YTNodes.NavigationEndpoint,
      localData?: YTTrackInfo,
    ): Promise<YTTrackInfo> => {
      if (localData?.localFileUrl) {
        const resolvedSource = await resolveAudioStreamingSource(
          youtube,
          target,
          {localUrl: localData.localFileUrl},
        );

        if (!resolvedSource) {
          throw new Error("Local audio source is not available");
        }

        localData.audioSource = resolvedSource.source;
        return localData;
      }

      if (!youtube) {
        throw new Error("YouTube session is not ready");
      }

      const [resolvedSource, info] = await Promise.all([
        resolveAudioStreamingSource(youtube, target),
        youtube.music.getInfo(target),
      ]);

      if (!resolvedSource?.info) {
        throw new Error("No playable audio source available");
      }

      // Metadaten kommen aus YouTube Music, Streaming-Daten ausschließlich aus
      // der anonymen, gehärteten Audio-Client-Kette.
      info.streaming_data = resolvedSource.info.streaming_data;

      const element = getElementDataFromTrackInfo(info);
      element.audioSource = resolvedSource.source;

      if (info.playability_status?.status === "LOGIN_REQUIRED") {
        resetRejectedPlaybackSession("audio-metadata");
        throw new Error(`Login Required: ${info.playability_status.reason}`);
      }

      return element;
    },
    [youtube],
  );

  const videoExtractor = useCallback(
    async (videoData: VideoData) => {
      // console.log("VideoExtractor", videoData);
      // TODO: Check if navEndpoint contains at least a videoId as browseId only does not work. :/
      // const useNav =
      //   videoData.navEndpoint && videoData.navEndpoint?.payload?.videoId;
      // TODO: Check if localData in DB available?
      const localData = await getTrackInfoForVideo(videoData.id);
      const element = await resolveTrack(
        videoData.navEndpoint ?? videoData.id,
        localData,
      );

      // Set Local Playlist ID if a local element called
      element.localPlaylistId = videoData.localPlaylistId;

      return element;
    },
    [resolveTrack],
  );

  const videoExtractorNavigationEndpoint = useCallback(
    async (navigationEndpoint: YTNodes.NavigationEndpoint) => {
      return resolveTrack(navigationEndpoint);
    },
    [resolveTrack],
  );

  return {videoExtractor, videoExtractorNavigationEndpoint};
}
