import {useYoutubeContext} from "../../context/YoutubeContext";
import {parseObservedArray} from "../../extraction/ArrayExtraction";
import {YTPlaylist, YTVideoInfo} from "../../extraction/Types";
import {
  getElementDataFromVideoInfo,
  getElementDataFromYTPlaylist,
} from "../../extraction/YTElements";

type InnerTube = ReturnType<typeof useYoutubeContext>;

type YoutubeAPIRequest =
  | YoutubeVideoRequest
  | YoutubePlaylistRequest
  | YoutubeHomeRequest;

interface YoutubeVideoRequest {
  request: "video";
  videoId: string;
}

interface YoutubeVideoResponse {
  type: "videoResponse";
  id: string;
  title: string;
  duration: number;
  steamURL: string;
  validUntil: number;
  coverUrl: string;
}

interface YoutubePlaylistRequest {
  request: "playlist";
  playlistId: string;
}

interface YoutubePlaylistResponse {
  type: "playlistResponse";
  id: string;
  title: string;
  coverUrl: string;
  videoIds: string[];
}

interface YoutubeHomeRequest {
  request: "home";
}

export async function handleWatchMessage(
  youtube: InnerTube,
  request: YoutubeAPIRequest,
) {
  console.log("Handle watch request: ", request);
  if (request.request === "video") {
    const ytInfo = await youtube.getInfo(request.videoId);
    const info = getElementDataFromVideoInfo(ytInfo);

    const format = ytInfo.chooseFormat({type: "audio"});
    const streamURL = format.decipher(youtube.session.player);
    const validUntil = Date.now() + 19800000; // 5,5 hours valid from now on.
    console.log("Valid until: ", validUntil);

    return toVideoResponse(
      info,
      streamURL,
      validUntil,
      format.approx_duration_ms,
    );
  } else if (request.request === "playlist") {
    const playlist = await youtube.music.getPlaylist(request.playlistId);
    const ytPlaylist = await youtube.getPlaylist(request.playlistId);
    const ytInfo = getElementDataFromYTPlaylist(ytPlaylist);
    console.log("Playlist : ", playlist);
    const pItems = parseObservedArray(playlist.items);
    const videoIds = pItems.map(value => value.id);
    console.log("VideoIDs : ", videoIds);

    return toPlaylistResponse(ytInfo, request.playlistId, videoIds);
  } else if (request.request === "home") {
    const home = await youtube.music.getHomeFeed();
    console.log("Home: ", home.sections);

    const lib = await youtube.getLibrary();
    console.log("Playlist: ", lib.playlists);
  }
}

// Transformers

function toVideoResponse(
  videoInfo: YTVideoInfo,
  streamURL: string,
  validUntil: number,
  duration_ms: number,
) {
  return {
    type: "videoResponse",
    id: videoInfo.id,
    title: videoInfo.title,
    duration: duration_ms,
    coverUrl: videoInfo.thumbnailImage.url,
    steamURL: streamURL,
    validUntil,
  } as YoutubeVideoResponse;
}

function toPlaylistResponse(
  playlistInfo: YTPlaylist,
  id: string,
  videoIds: string[],
) {
  return {
    type: "playlistResponse",
    id,
    title: playlistInfo.title,
    videoIds,
    coverUrl: playlistInfo.thumbnailImage.url,
  } as YoutubePlaylistResponse;
}
