import _ from "lodash";

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
import usePlaylistManager from "@/hooks/playlist/usePlaylistManager";
import {resolveStreamingSource} from "@/utils/PlaybackSource";
import {YT} from "@/utils/Youtube";

const LOGGER = Logger.extend("WATCH_YT_API");

type InnerTube = ReturnType<typeof useYoutubeContext>;

type YoutubeAPIRequest =
  | YoutubeVideoRequest
  | YoutubePlaylistRequest
  | YoutubePlaylistSyncRequest
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
  // Workaround to always use mp4 stream for downloads. Fehlt, wenn sich kein
  // Audioformat entziffern ließ — gestreamt wird dann trotzdem.
  downloadURL?: string;
  validUntil: number;
  coverUrl: string;
}

interface YoutubePlaylistRequest {
  request: "playlist";
  playlistId: string;
}

interface YoutubePlaylistSyncRequest {
  request: "playlist-sync";
  playlistId: string;
  videoIds: string[];
}

interface YoutubePlaylistResponse {
  type: "playlistResponse";
  id: string;
  title: string;
  coverUrl: string;
  videos: PlaylistVideoItem[];
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
  playlistManager: ReturnType<typeof usePlaylistManager>,
) {
  LOGGER.debug("Handle watch request: ", request);
  if (request.request === "video") {
    if (!youtube) {
      LOGGER.warn("No video info found or youtube uninitialized.");
      return;
    }

    // Dieselbe Client-Kette wie die Wiedergabe auf dem Gerät (Plan-Phase 1.4)
    // statt des festen `IOS`: fällt ein Client aus, war das Lied auf der Uhr
    // bisher tot. `youtube-hls` ist der Modus der Uhr — sie spielt YouTubes
    // eigenes Manifest über AVPlayer, das selbst gebaute lässt sich nicht
    // hinüberreichen (sein Master referenziert den Cache des Telefons).
    const streaming = await resolveStreamingSource(youtube, request.videoId, {
      mode: "youtube-hls",
    });

    const hlsManifestUrl = streaming?.info.streaming_data?.hls_manifest_url;

    if (!streaming || !hlsManifestUrl) {
      LOGGER.warn(
        `Kein Client lieferte ein HLS-Manifest für ${request.videoId} — ` +
          "die Uhr bekommt keine Streaming-Daten.",
      );
      return;
    }

    let info = getElementDataFromVideoInfo(streaming.info);
    // TODO: Fetch from music endpoint?

    // Die Uhr lädt Downloads als eine Datei herunter und braucht dafür eine
    // Einzel-URL; für die Wiedergabe nimmt sie das Manifest. Fehlt ein
    // Audioformat, bleibt das Streamen trotzdem möglich — deshalb kein Abbruch.
    const format = chooseAudioFormat(streaming.info);
    const downloadURL = await format
      ?.decipher(youtube.session.player)
      .catch(e => {
        LOGGER.warn(
          `Decipher der Download-URL fehlgeschlagen (itag=${format?.itag}): ${String(
            e?.message ?? e,
          )}`,
        );
        return undefined;
      });

    // Die echte Ablaufzeit aus den Streaming-Daten statt der bisherigen
    // Schätzung von 5,5 Stunden: die Uhr verwirft abgelaufene Einträge selbst
    // (`DBUtils.swift`), dafür muss der Wert stimmen.
    //
    // Fehlt `expiresInSeconds` in der Antwort, wird daraus ein ungültiges Datum
    // — und `NaN` ließe sich nicht als Nachricht kodieren. Dann bleibt es bei
    // der alten Schätzung.
    const expiresAt = streaming.info.streaming_data!.expires?.getTime();
    const validUntil = Number.isFinite(expiresAt)
      ? expiresAt
      : Date.now() + 19800000; // 5,5 Stunden ab jetzt.
    LOGGER.debug(
      `Streams von ${streaming.client}, gültig bis ${new Date(
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
    );
  } else if (request.request === "playlist") {
    const playlist = await getMusicPlaylistDetails(request.playlistId, youtube);
    console.log("Playlist : ", playlist);
    const videoIds = playlist.items?.map(value => value.id);
    LOGGER.debug("VideoIDs : ", videoIds);

    return toPlaylistResponse(playlist, request.playlistId);
  } else if (request.request === "playlist-sync") {
    const playlist = await getMusicPlaylistDetails(request.playlistId, youtube);
    const videoIds = playlist.items.map(value => value.id) as string[];
    const diff = _.difference(request.videoIds, videoIds);
    if (diff.length > 0) {
      await playlistManager.saveVideoToPlaylist(diff, request.playlistId);
    } else {
      LOGGER.warn(
        `No difference for playlist with id ${request.playlistId} found. Nothing to sync`,
      );
    }
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

    return {
      type: "homeResponse",
      sections,
    } as YoutubeHomeResponse;
  } else if (request.request === "library-playlists") {
    const playlistIds = musicLibrary.data
      ?.filter(e => e.type === "playlist")
      .map(playlist => playlist.id);

    if (playlistIds) {
      const libraryResponses = await Promise.all(
        playlistIds.map(async id => {
          const p = await getMusicPlaylistDetails(id, youtube);
          return toPlaylistResponse(p, id);
        }),
      );
      return libraryResponses;
    }
  }
}

// Transformers

/**
 * Das beste reine Audioformat — die Einzel-URL für den Download auf der Uhr.
 *
 * `chooseFormat` wirft, wenn nichts passt (SABR-only etwa). Das darf die
 * Wiedergabe nicht verhindern: gestreamt wird über das Manifest.
 */
function chooseAudioFormat(info: YT.VideoInfo) {
  try {
    return info.chooseFormat({type: "audio", quality: "best"});
  } catch (e) {
    LOGGER.warn("Kein Audioformat für den Download verfügbar", e);
    return undefined;
  }
}

function toVideoResponse(
  videoInfo: YTVideoInfo | YTTrackInfo,
  downloadURL: string | undefined, // Workaround for download issues see type definition
  streamURL: string,
  validUntil: number,
  duration_ms: number,
) {
  return {
    type: "videoResponse",
    id: videoInfo.id,
    title: videoInfo.title,
    artist: videoInfo.author?.name ?? "Unknown artist",
    duration: duration_ms,
    coverUrl: videoInfo.thumbnailImage.url,
    streamURL,
    downloadURL,
    validUntil,
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

  return {
    type: "playlistResponse",
    id,
    title: playlistInfo.title,
    videos,
    coverUrl: playlistInfo.thumbnailImage?.url,
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
