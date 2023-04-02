import React from "react";
import useVideoDetails from "../hooks/useVideoDetails";
import Video from "react-native-video";
import {useRef} from "react";

interface Props {
  videoId: string;
}

export default function VideoComponent({videoId}: Props) {
  const video = useVideoDetails(videoId);
  const player = useRef<Video>();

  if (!video) {
    return null;
  }

  const selectedVideo = video.metadata.playbackEndpoints[0];
  console.log("Video: ", selectedVideo);

  return (
    <Video
      source={{uri: selectedVideo.url}}
      style={{
        width: 200,
        height: 200,
      }}
    />
  );
}
