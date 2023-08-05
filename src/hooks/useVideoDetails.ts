import {useYoutubeContext} from "../context/YoutubeContext";
import {useEffect, useMemo, useState} from "react";
import {YT} from "../utils/Youtube";
import Logger from "../utils/Logger";

const LOGGER = Logger.extend("VIDEO");

export default function useVideoDetails(videoId: string) {
  const youtube = useYoutubeContext();
  const [Video, setVideo] = useState<YT.VideoInfo>();
  const isLivestream = useMemo(
    () => !!Video?.streaming_data?.hls_manifest_url,
    [Video],
  );

  useEffect(() => {
    youtube?.getInfo(videoId).then(setVideo).catch(console.warn);
  }, [videoId, youtube]);

  const httpVideoURL = useMemo(() => {
    if (!youtube?.actions.session.player) {
      return undefined;
    }
    // TODO: Add fallback if no matching format found
    try {
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
      LOGGER.warn(e);
    }
    return undefined;
  }, [Video, youtube]);

  LOGGER.debug("Video: ", httpVideoURL);

  return {
    Video,
    hlsManifestUrl: Video?.streaming_data?.hls_manifest_url,
    httpVideoURL,
    isLivestream,
  };
}
