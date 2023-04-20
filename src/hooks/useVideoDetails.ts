import {useYoutubeContext} from "../context/YoutubeContext";
import {useEffect, useMemo, useState} from "react";
import {YT} from "../utils/Youtube";

export default function useVideoDetails(videoId: string) {
  const youtube = useYoutubeContext();
  const [Video, setVideo] = useState<YT.VideoInfo>();

  useEffect(() => {
    youtube?.getInfo(videoId).then(setVideo).catch(console.warn);
  }, [videoId, youtube]);

  // console.log("Video: ", JSON.stringify(Video, null, 2));
  const selectedVideo = useMemo(() => {
    if (!youtube?.actions.session.player) {
      return undefined;
    }
    // TODO: Add fallback if no matching format found
    try {
      return Video?.chooseFormat({type: "video+audio"}).decipher(
        youtube.actions.session.player,
      );
    } catch (e) {
      console.warn(e);
    }
    return undefined;
  }, [Video, youtube]);

  console.log("Video: ", selectedVideo);

  return {Video, selectedVideo};
}
