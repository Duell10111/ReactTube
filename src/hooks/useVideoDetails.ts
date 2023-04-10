import {useYoutubeContext} from "../context/YoutubeContext";
import {useEffect, useMemo, useState} from "react";
import selectVideo from "../utils/VideoSelector";

export default function useVideoDetails(videoId: string) {
  const youtube = useYoutubeContext();
  const [Video, setVideo] = useState<VideoInfo>();

  useEffect(() => {
    youtube?.getBasicInfo(videoId).then(setVideo).catch(console.warn);
  }, [videoId, youtube]);

  // console.log("Video: ", JSON.stringify(Video, null, 2));
  const selectedVideo = useMemo(() => {
    return Video?.chooseFormat({type: "video+audio"}).decipher(
      youtube?.actions.session.player,
    );
  }, [Video]);

  console.log("Video: ", selectedVideo);

  return {Video, selectedVideo};
}
