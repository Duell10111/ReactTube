import {useYoutubeContext} from "../../context/YoutubeContext";
import {YTVideoInfo} from "../../extraction/Types";
import {getElementDataFromVideoInfo} from "../../extraction/YTElements";

type InnerTube = ReturnType<typeof useYoutubeContext>;

type YoutubeAPIRequest = YoutubeVideoRequest | YoutubePlaylistRequest;

interface YoutubeVideoRequest {
  request: "video";
  videoId: string;
}

interface YoutubeVideoResponse {
  type: "videoResponse";
  id: string;
  title: string;
  duration: number;
  fileURL: string;
  coverUrl: string;
}

interface YoutubePlaylistRequest {
  request: "playlist";
  playlistID: string;
}

export async function handleWatchMessage(
  youtube: InnerTube,
  request: YoutubeAPIRequest,
) {
  if (request.request === "video") {
    const ytInfo = await youtube.getInfo(request.videoId);
    const info = getElementDataFromVideoInfo(ytInfo);

    const format = ytInfo.chooseFormat({type: "audio"});
    const streamURL = format.decipher(youtube.session.player);

    return toVideoResponse(info, streamURL, format.approx_duration_ms);
  }
}

// Transformers

function toVideoResponse(
  videoInfo: YTVideoInfo,
  streamURL: string,
  duration_ms: number,
) {
  return {
    type: "videoResponse",
    id: videoInfo.id,
    title: videoInfo.title,
    duration: duration_ms,
    coverUrl: videoInfo.thumbnailImage.url,
    fileURL: streamURL,
  } as YoutubeVideoResponse;
}
