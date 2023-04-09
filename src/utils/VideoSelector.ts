import {
  audioFormat,
  video,
  videoFormat,
} from "youtube-extractor/dist/src/types";

type VideoFormat = videoFormat | audioFormat;

export default function selectVideo(video: video) {
  // console.log(video);
  const videoFormats =
    video.metadata.playbackEndpoints?.filter(
      v => v?.audioChannels !== undefined,
    ) ?? [];

  const bestVideos = findBestQuality(videoFormats);

  console.log("Player Endpoints: ", JSON.stringify(bestVideos, null, 4));
}

const qualityTableVideo = ["hd1080", "hd720", "medium"];
const qualityTableAudio = ["AUDIO_QUALITY_MEDIUM"];

function findBestQuality(videos: VideoFormat[]) {
  for (const quality of qualityTableVideo) {
    const vTables = videos.filter(v => v.quality === quality);
    if (vTables.length > 0) {
      return vTables;
    }
  }
  return [];
}
