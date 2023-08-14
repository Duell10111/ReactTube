import {useYoutubeContext} from "../context/YoutubeContext";
import {useEffect, useMemo, useState} from "react";
import {YT, YTNodes} from "../utils/Youtube";
import Logger from "../utils/Logger";
import {useAppData} from "../context/AppDataContext";
import {getElementDataFromVideoInfo} from "../extraction/YTElements";

const LOGGER = Logger.extend("VIDEO");

export default function useVideoDetails(
  videoId: string | YTNodes.NavigationEndpoint,
) {
  const youtube = useYoutubeContext();
  const [Video, setVideo] = useState<YT.VideoInfo>();
  const {appSettings} = useAppData();

  useEffect(() => {
    youtube
      ?.getInfo(videoId, appSettings.hlsEnabled ? "iOS" : undefined)
      .then(setVideo)
      .catch(console.warn);
  }, [appSettings.hlsEnabled, videoId, youtube]);

  const YTVideoInfo = useMemo(() => {
    return Video ? getElementDataFromVideoInfo(Video) : undefined;
  }, [Video]);

  // console.log("HLS: ", Video?.streaming_data?.hls_manifest_url);

  const httpVideoURL = useMemo(() => {
    if (!youtube?.actions.session.player) {
      return undefined;
    }
    // TODO: Add fallback if no matching format found
    try {
      console.log(Video?.streaming_data?.formats);
      let format = Video?.chooseFormat({
        type: "video+audio",
        quality: "best",
      });
      if (!format) {
        LOGGER.debug("Fallback to audio only Stream!");
        format = Video?.chooseFormat({
          type: "audio",
          quality: "best",
        });
      }
      LOGGER.debug("Format: ", format?.quality_label);
      return format?.decipher(youtube.actions.session.player);
    } catch (e) {
      LOGGER.warn("Error while matching formats: ", e);
    }
    return undefined;
  }, [Video, youtube]);

  LOGGER.debug("Video: ", httpVideoURL);

  return {
    Video,
    YTVideoInfo,
    hlsManifestUrl: Video?.streaming_data?.hls_manifest_url,
    httpVideoURL,
  };
}
