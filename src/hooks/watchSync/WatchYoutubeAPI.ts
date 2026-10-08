import Logger from "../../utils/Logger";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {
  parseObservedArray,
  parseObservedArrayHorizontalData,
} from "@/extraction/ArrayExtraction";
import {
  ElementData,
  YTPlaylist,
  YTTrackInfo,
  YTVideoInfo,
} from "@/extraction/Types";
import {
  getElementDataFromTrackInfo,
  getElementDataFromVideoInfo,
} from "@/extraction/YTElements";
import useMusicLibrary from "@/hooks/music/useMusicLibrary";
import {getMusicPlaylistDetails} from "@/hooks/music/useMusicPlaylistDetails";
import {resolveStreamingSource} from "@/utils/PlaybackSource";
import {YT} from "@/utils/Youtube";
import {getLoudnessDb} from "@/utils/music/LoudnessNormalization";

const LOGGER = Logger.extend("WATCH_YT_API");

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
  artist: string;
  duration: number;
  streamURL: string;
  // Workaround to always use mp4 stream for downloads. Missing if no audio
  // format could be deciphered; streaming still works in that case.
  downloadURL?: string;
  validUntil: number;
  coverUrl: string;
  /** Offset from the YouTube loudness reference in dB, if known. */
  loudnessDb?: number;
}

interface YoutubePlaylistRequest {
  request: "playlist";
  playlistId: string;
}

interface YoutubePlaylistResponse {
  type: "playlistResponse";
  id: string;
  title: string;
  coverUrl?: string;
  videos: PlaylistVideoItem[];
}

interface YoutubeLibraryPlaylistRequest {
  request: "library-playlists";
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
  videos: PlaylistVideoItem[];
  videoIds?: string[];
  coverUrl: string;
}

interface PlaylistVideoItem {
  id: string;
  title: string;
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
  // Data provider
  musicLibrary: ReturnType<typeof useMusicLibrary>,
) {
  LOGGER.debug("Handle watch request: ", request);
  if (request.request === "video") {
    if (!youtube) {
      LOGGER.warn("No video info found or youtube uninitialized.");
      return;
    }

    // The same client chain as playback on the phone (plan phase 1.4) instead
    // of a fixed `IOS` client: previously the song was dead on the watch as
    // soon as that one client failed. `youtube-hls` is the watch mode: it plays
    // YouTube's own manifest through AVPlayer. The self-built one cannot be
    // handed over because its master references the phone's cache.
    const streaming = await resolveStreamingSource(youtube, request.videoId, {
      mode: "youtube-hls",
    });

    const hlsManifestUrl = streaming?.info.streaming_data?.hls_manifest_url;

    if (!streaming || !hlsManifestUrl) {
      LOGGER.warn(
        `No client returned an HLS manifest for ${request.videoId}; ` +
          "the watch gets no streaming data.",
      );
      return;
    }

    let info = getElementDataFromVideoInfo(streaming.info);
    // TODO: Fetch from music endpoint?

    // The watch downloads a single file and needs a direct URL for it; for
    // playback it uses the manifest. Without an audio format streaming still
    // works, so this does not abort.
    const format = chooseAudioFormat(streaming.info);
    const downloadURL = await format
      ?.decipher(youtube.session.player)
      .catch(e => {
        LOGGER.warn(
          `Deciphering the download URL failed (itag=${format?.itag}): ${String(
            e?.message ?? e,
          )}`,
        );
        return undefined;
      });

    // The real expiry from the streaming data instead of the former estimate
    // of 5.5 hours: the watch discards expired entries itself (`DBUtils.swift`),
    // so the value has to be correct.
    //
    // Without `expiresInSeconds` in the response this becomes an invalid date,
    // and `NaN` cannot be encoded in a message. Then the old estimate is used.
    const expiresAt = streaming.info.streaming_data!.expires?.getTime();
    const validUntil = Number.isFinite(expiresAt)
      ? expiresAt
      : Date.now() + 19800000; // 5.5 hours from now.
    LOGGER.debug(
      `Streams from ${streaming.client}, valid until ${new Date(
        validUntil,
      ).toISOString()}`,
    );

    try {
      // Override normal info with music info
      // @ts-ignore Ignore typo issues
      info = getElementDataFromTrackInfo(
        await youtube.music.getInfo(request.videoId),
      );
    } catch (e) {
      LOGGER.warn("Error fetching music info. Skipping musicInfo data", e);
    }

    return toVideoResponse(
      info,
      downloadURL,
      hlsManifestUrl,
      validUntil,
      format?.approx_duration_ms ??
        (streaming.info.basic_info.duration ?? 0) * 1000,
      getLoudnessDb(streaming.info, format),
    );
  } else if (request.request === "playlist") {
    const playlist = await getMusicPlaylistDetails(request.playlistId, youtube);
    console.log("Playlist : ", playlist);
    const videoIds = playlist.items?.map(value => value.id);
    LOGGER.debug("VideoIDs : ", videoIds);

    return toPlaylistResponse(playlist, request.playlistId);
  } else if (request.request === "home" && youtube) {
    const home = await youtube.music.getHomeFeed();
    const data = home.sections
      ? parseObservedArrayHorizontalData(home.sections)
      : [];
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

    // Keep every transfer well below WatchConnectivity's message-size limit
    // and let the watch render the feed incrementally.
    return sections.map(
      section =>
        ({
          type: "homeResponse",
          sections: [section],
        }) as YoutubeHomeResponse,
    );
  } else if (request.request === "library-playlists") {
    const playlistIds = [
      ...new Set(
        musicLibrary.data
          ?.filter(e => e.type === "playlist")
          .map(playlist => playlist.id) ?? [],
      ),
    ];

    const libraryResponses = await Promise.all(
      playlistIds.map(async id => {
        try {
          const p = await getMusicPlaylistDetails(id, youtube);
          return toPlaylistResponse(p, id);
        } catch (error) {
          LOGGER.warn(`Failed to sync playlist ${id} to the watch`, error);
          return undefined;
        }
      }),
    );
    return libraryResponses.filter(response => response !== undefined);
  }
}

// Transformers

/**
 * The best audio-only format: the direct URL for downloads on the watch.
 *
 * `chooseFormat` throws if nothing matches (SABR-only, for example). That must
 * not prevent playback, which streams through the manifest.
 */
function chooseAudioFormat(info: YT.VideoInfo) {
  try {
    return info.chooseFormat({type: "audio", quality: "best"});
  } catch (e) {
    LOGGER.warn("No audio format available for the download", e);
    return undefined;
  }
}

function toVideoResponse(
  videoInfo: YTVideoInfo | YTTrackInfo,
  downloadURL: string | undefined, // Workaround for download issues see type definition
  streamURL: string,
  validUntil: number,
  duration_ms: number,
  loudnessDb: number | undefined,
) {
  return {
    type: "videoResponse",
    id: videoInfo.id,
    title: videoInfo.title,
    artist: videoInfo.author?.name ?? "Unknown artist",
    duration: duration_ms,
    coverUrl: videoInfo.thumbnailImage.url,
    streamURL,
    ...(downloadURL ? {downloadURL} : {}),
    validUntil,
    // `undefined` cannot be sent to the watch, so the key is omitted instead.
    ...(loudnessDb !== undefined ? {loudnessDb} : {}),
  } as YoutubeVideoResponse;
}

// TODO: Additionally pass ElementsData for more information?
function toPlaylistResponse(playlistInfo: YTPlaylist, id: string) {
  console.log("YTPLAYLIST: ", playlistInfo);
  console.log("YTPLAYLISTThumb: ", playlistInfo.thumbnailImage);

  const videos = playlistInfo.items.map(
    value =>
      ({
        id: value.id,
        title: value.title,
        coverUrl: value.thumbnailImage.url,
      }) as PlaylistVideoItem,
  );

  const coverUrl = playlistInfo.thumbnailImage?.url;
  return {
    type: "playlistResponse",
    id,
    title: playlistInfo.title,
    videos,
    ...(coverUrl ? {coverUrl} : {}),
  } as YoutubePlaylistResponse;
}

// HomeResponse

async function toHomeResponse(
  youtube: InnerTube,
  elementData: ElementData,
  temp?: boolean,
) {
  if (elementData.type === "playlist" && youtube) {
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
