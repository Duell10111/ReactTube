import {useYoutubeContext} from "../../context/YoutubeContext";
import {
  parseObservedArray,
  parseObservedArrayHorizontalData,
} from "../../extraction/ArrayExtraction";
import {gridCalculatorExtract} from "../../extraction/ShelfExtraction";
import {ElementData, YTPlaylist, YTVideoInfo} from "../../extraction/Types";
import {
  getElementDataFromVideoInfo,
  getElementDataFromYTMusicPlaylist,
  getElementDataFromYTPlaylist,
} from "../../extraction/YTElements";

type InnerTube = ReturnType<typeof useYoutubeContext>;

type YoutubeAPIRequest =
  | YoutubeVideoRequest
  | YoutubePlaylistRequest
  | YoutubeLibraryPlaylistRequest
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

interface YoutubeLibraryPlaylistRequest {
  request: "library-playlists";
}

interface YoutubeLibraryPlaylistResponse {
  type: "library-playlists";
  playlists: YoutubePlaylistResponse[];
}

interface YoutubeHomeRequest {
  request: "home";
}

interface YoutubeHomeResponse {
  type: "homeResponse";
  sections: YoutubeHomeResponseSection[];
}

interface YoutubeHomeResponseSection {
  title: string;
  data: (YoutubeHomeResponsePlaylistItem | YoutubeHomeResponseVideoItem)[];
}

interface YoutubeHomeResponsePlaylistItem {
  type: "playlist";
  id: string;
  temp?: boolean;
  title: string;
  videoIds: string[];
  coverUrl: string;
}

interface YoutubeHomeResponseVideoItem {
  type: "video";
  id: string;
  temp?: boolean;
  title: string;
  coverUrl: string;
}

// Cache Interface

export async function handleWatchMessage(
  youtube: InnerTube,
  request: YoutubeAPIRequest,
) {
  console.log("Handle watch request: ", request);
  if (request.request === "video") {
    const ytInfo = await youtube.getInfo(request.videoId);
    const info = getElementDataFromVideoInfo(ytInfo);

    const format = ytInfo.chooseFormat({type: "audio"});
    console.log("Format: ", format);
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
    const data = parseObservedArrayHorizontalData(home.sections);
    // console.log("Filters: ", home.filters);
    // console.log("Home: ", JSON.stringify(home.sections));
    // const parsedData = parseObservedArrayHorizontalData(home.sections);
    console.log("Parsed Home: ", data);

    const sections = await Promise.all(
      data.map(async section => {
        const responseData = (
          await Promise.all(
            section.parsedData.map(playlist => {
              return toHomeResponse(youtube, playlist, true);
            }),
          )
        ).filter(v => v);
        return {
          title: section.title,
          data: responseData,
        } as YoutubeHomeResponseSection;
      }),
    );

    return {
      type: "homeResponse",
      sections,
    } as YoutubeHomeResponse;
  } else if (request.request === "library-playlists") {
    const lib = await youtube.music.getLibrary();
    // const recap = await youtube.music.getRecap();
    const contents = gridCalculatorExtract(lib.contents[0], 3);
    console.log("Contents: ", contents);
    const playlistData = contents
      .map(v => (Array.isArray(v) ? v : v.parsedData))
      .flat()
      .filter(v => v.type === "playlist");
    console.log("Playlists: ", playlistData);
    const libraryPlaylists = (
      await Promise.all(
        playlistData.map(async playlist => {
          const p = await youtube.music.getPlaylist(playlist.id);
          const data = getElementDataFromYTMusicPlaylist(p);
          data.title = playlist.title;
          data.thumbnailImage = playlist.thumbnailImage;
          console.log("Items: ", data.items);
          const ids = data.items
            .filter(v => v && v.type === "video")
            .map(v => v.id);
          // TODO: Create Playlist object which allows continuation, with caching?
          if (ids.length > 0) {
            return toPlaylistResponse(data, playlist.id, ids);
          }
        }),
      )
    ).filter(v => v);

    return {
      type: "library-playlists",
      playlists: libraryPlaylists,
    } as YoutubeLibraryPlaylistResponse;
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

// TODO: Additionally pass ElementsData for more information?
function toPlaylistResponse(
  playlistInfo: YTPlaylist,
  id: string,
  videoIds: string[],
) {
  console.log("YTPLAYLIST: ", playlistInfo);
  console.log("YTPLAYLISTThumb: ", playlistInfo.thumbnailImage);
  return {
    type: "playlistResponse",
    id,
    title: playlistInfo.title,
    videoIds,
    coverUrl: playlistInfo.thumbnailImage?.url,
  } as YoutubePlaylistResponse;
}

// HomeResponse

async function toHomeResponse(
  youtube: InnerTube,
  elementData: ElementData,
  temp?: boolean,
) {
  if (elementData.type === "playlist") {
    const ytPlaylist = await youtube.getPlaylist(elementData.id);
    const pItems = parseObservedArray(ytPlaylist.items);
    const videoIds = pItems.map(value => value.id);
    if (videoIds.length > 0) {
      return {
        type: "playlist",
        id: elementData.id,
        title: elementData.title,
        coverUrl: elementData.thumbnailImage.url,
        temp,
        videoIds,
      } as YoutubeHomeResponsePlaylistItem;
    }
  } else if (elementData.type === "video") {
    return {
      type: "video",
      id: elementData.id,
      title: elementData.title,
      coverUrl: elementData.thumbnailImage.url,
      temp,
    } as YoutubeHomeResponseVideoItem;
  }
}
