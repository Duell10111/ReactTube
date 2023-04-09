import {useYoutubeContext} from "../context/YoutubeContext";
import {useEffect, useState} from "react";
import {video} from "youtube-extractor/dist/src/types";
import selectVideo from "../utils/VideoSelector";

export default function useVideoDetails(videoId: string) {
  const youtube = useYoutubeContext();
  const [Video, setVideo] = useState<video>();

  useEffect(() => {
    youtube?.getVideoDetails(videoId).then(setVideo).catch(console.warn);
  }, [videoId, youtube]);

  // console.log("Video: ", JSON.stringify(Video, null, 2));
  Video && selectVideo(Video);

  return Video;
}
