import {useEffect, useMemo, useState} from "react";

import {useYoutubeContext} from "../../context/YoutubeContext";
import {getElementDataFromVideoInfo} from "../../extraction/YTElements";
import {YTNodes, YT, Innertube} from "../../utils/Youtube";

export default function useMusicPlayer(
  target: string | YTNodes.NavigationEndpoint,
) {
  const youtube = useYoutubeContext();
  const [video, setVideo] = useState<YT.VideoInfo>();

  useEffect(() => {
    youtube.getInfo(target, "IOS").then(setVideo);
  }, [target, youtube]);

  const videoData = useMemo(
    () => (video ? getElementDataFromVideoInfo(video) : undefined),
    [video],
  );

  // Current Format Extraction

  const videoFormat = useMemo(() => {
    return false ? getFormat(youtube, video, "video+audio") : undefined;
  }, [video]);

  const audioFormat = useMemo(() => {
    return video ? getFormat(youtube, video, "audio") : undefined;
  }, [video]);

  const hlsAudio = useMemo(() => {
    return video ? video.streaming_data.hls_manifest_url : undefined;
  }, [video]);

  const getNextSong = () => {};

  return {
    videoData,
    video,
    videoFormat,
    audioFormat,
    hlsAudio,
  };
}

export function getFormat(
  youtube: Innertube,
  videoInfo: YT.VideoInfo,
  type: "audio" | "video+audio",
) {
  const format = videoInfo.chooseFormat({type});
  return format.decipher(youtube.session.player);
}
