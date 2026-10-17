import type {SiriLastPlayedTrack} from "./lastPlayedTrack";
import {matchSiriLibrary, SiriLibrary} from "./matchSiriLibrary";
import type {SiriPlayRequest} from "./parseSiriRequest";
import {
  rankSiriSearchResults,
  SiriRankQuery,
  SiriSearchCandidate,
} from "./rankSiriSearchResults";

import {getElementDataFromYTMusicArtist} from "@/extraction/YTElements";
import {Helpers, Innertube, YTNodes} from "@/utils/Youtube";

export type SiriResolution =
  | {
      kind: "play";
      endpoint: YTNodes.NavigationEndpoint;
      /** What Siri may announce; omitted when unknown. */
      title?: string;
      artist?: string;
      /** Where the endpoint came from when not from the search; for logs. */
      via?: string;
    }
  /** Nothing specific was asked for and something is loaded: just continue. */
  | {kind: "resume"}
  /** A downloaded track; plays offline, too. */
  | {kind: "playDownload"; videoId: string; title: string; artist?: string}
  /** A playlist stored in the app; the player builds the queue from the database. */
  | {kind: "playLocalPlaylist"; playlistId: string; title: string}
  | {kind: "notFound"};

type MusicSearchType = "song" | "video" | "album" | "playlist" | "artist";

/** How many results are considered; later ones are rarely what was meant. */
const MAX_CANDIDATES = 10;

function toCandidate(
  item: YTNodes.MusicResponsiveListItem,
): SiriSearchCandidate {
  const title =
    item.title ?? item.name ?? item.flex_columns[0]?.title?.text ?? "";
  const artists = (item.artists ?? item.authors ?? [])
    .map(artist => artist.name)
    .concat(item.author ? [item.author.name] : []);
  const type =
    item.item_type === "song" ||
    item.item_type === "video" ||
    item.item_type === "album" ||
    item.item_type === "artist" ||
    item.item_type === "playlist"
      ? item.item_type
      : "unknown";
  return {title, artists, type};
}

function playEndpointOf(item: YTNodes.MusicResponsiveListItem) {
  return item.overlay?.content?.endpoint ?? item.endpoint;
}

async function searchBest(
  youtube: Innertube,
  query: string,
  type: MusicSearchType,
  rankQuery: SiriRankQuery,
) {
  const search = await youtube.music.search(query, {type});
  const items = (
    search.contents?.firstOfType(YTNodes.MusicShelf)?.contents ?? []
  ).slice(0, MAX_CANDIDATES);
  const index = rankSiriSearchResults(rankQuery, items.map(toCandidate));
  return index >= 0 ? items[index] : undefined;
}

function announced(item: YTNodes.MusicResponsiveListItem) {
  const candidate = toCandidate(item);
  return {title: candidate.title || undefined, artist: candidate.artists[0]};
}

async function resolveSong(
  youtube: Innertube,
  request: Extract<SiriPlayRequest, {kind: "song"}>,
): Promise<SiriResolution> {
  const rankQuery = {title: request.title, artist: request.artist};
  // Not everything is released as a song on YouTube Music; fall back to videos.
  const item =
    (await searchBest(youtube, request.query, "song", rankQuery)) ??
    (await searchBest(youtube, request.query, "video", rankQuery));
  const endpoint = item && playEndpointOf(item);
  return endpoint
    ? {kind: "play", endpoint, ...announced(item)}
    : {kind: "notFound"};
}

async function resolveArtist(
  youtube: Innertube,
  request: Extract<SiriPlayRequest, {kind: "artist"}>,
): Promise<SiriResolution> {
  const item = await searchBest(youtube, request.query, "artist", {
    title: request.artist,
  });
  if (!item?.id) {
    return {kind: "notFound"};
  }
  const artist = getElementDataFromYTMusicArtist(
    await youtube.music.getArtist(item.id),
    item.id,
  );
  // The artist's shuffle; the radio when there is no shuffle button.
  const endpoint = artist.playEndpoint ?? artist.radioEndpoint;
  return endpoint
    ? {kind: "play", endpoint, artist: toCandidate(item).title || undefined}
    : {kind: "notFound"};
}

/**
 * Album and playlist results only carry a `playlistId`, which the player cannot
 * start from. The first track's endpoint has the video and keeps the playlist
 * as queue.
 */
function firstTrackEndpoint(items: Iterable<Helpers.YTNode> | undefined) {
  for (const item of items ?? []) {
    if (item.is(YTNodes.MusicResponsiveListItem)) {
      const endpoint = playEndpointOf(item);
      if (endpoint?.payload?.videoId) {
        return endpoint;
      }
    }
  }
  return undefined;
}

async function resolveAlbum(
  youtube: Innertube,
  request: Extract<SiriPlayRequest, {kind: "album"}>,
): Promise<SiriResolution> {
  const item = await searchBest(youtube, request.query, "album", {
    title: request.album,
    artist: request.artist,
  });
  if (!item?.id) {
    return {kind: "notFound"};
  }
  const album = await youtube.music.getAlbum(item.id);
  const endpoint = firstTrackEndpoint(album.contents);
  return endpoint
    ? {kind: "play", endpoint, ...announced(item)}
    : {kind: "notFound"};
}

/** Account playlist ids from the TV client carry a "VL" browse prefix. */
function musicPlaylistId(id: string) {
  return id.startsWith("VL") ? id.slice(2) : id;
}

async function resolveAccountPlaylist(
  youtube: Innertube,
  id: string,
  title: string,
): Promise<SiriResolution> {
  const playlist = await youtube.music.getPlaylist(musicPlaylistId(id));
  const endpoint = firstTrackEndpoint(playlist.items);
  return endpoint
    ? {kind: "play", endpoint, title, via: "account playlist"}
    : {kind: "notFound"};
}

async function resolvePlaylist(
  youtube: Innertube,
  request: Extract<SiriPlayRequest, {kind: "playlist"}>,
): Promise<SiriResolution> {
  // Not one of the user's playlists (matched before): search public ones.
  const item = await searchBest(youtube, request.query, "playlist", {
    title: request.playlist,
  });
  if (!item?.id) {
    return {kind: "notFound"};
  }
  const playlist = await youtube.music.getPlaylist(item.id);
  const endpoint = firstTrackEndpoint(playlist.items);
  return endpoint
    ? {kind: "play", endpoint, title: toCandidate(item).title || undefined}
    : {kind: "notFound"};
}

/** The first playable track of the Music home feed, usually from "Quick picks". */
async function resolveHomeFeed(youtube: Innertube): Promise<SiriResolution> {
  const home = await youtube.music.getHomeFeed();
  for (const section of home.sections ?? []) {
    if (!section.is(YTNodes.MusicCarouselShelf)) {
      continue;
    }
    for (const item of section.contents) {
      if (item.is(YTNodes.MusicResponsiveListItem)) {
        const endpoint = playEndpointOf(item);
        if (endpoint?.payload?.videoId) {
          return {kind: "play", endpoint, ...announced(item)};
        }
      } else if (
        item.is(YTNodes.MusicTwoRowItem) &&
        item.endpoint?.payload?.videoId
      ) {
        return {kind: "play", endpoint: item.endpoint, title: item.title.text};
      }
    }
  }
  return {kind: "notFound"};
}

export async function resolveSiriRequest(
  youtube: Innertube,
  request: SiriPlayRequest,
  player: {
    hasCurrentItem: boolean;
    currentVideoId?: string;
    lastPlayed?: SiriLastPlayedTrack;
  },
  library?: SiriLibrary,
): Promise<SiriResolution> {
  const match = library && matchSiriLibrary(request, library);
  if (match?.kind === "download") {
    return {
      kind: "playDownload",
      videoId: match.download.videoId,
      title: match.download.title,
      artist: match.download.artist,
    };
  }
  if (match?.kind === "playlist") {
    return match.playlist.source === "local"
      ? {
          kind: "playLocalPlaylist",
          playlistId: match.playlist.id,
          title: match.playlist.title,
        }
      : resolveAccountPlaylist(
          youtube,
          match.playlist.id,
          match.playlist.title,
        );
  }

  switch (request.kind) {
    case "donated":
      return {
        kind: "play",
        endpoint: new YTNodes.NavigationEndpoint({
          watchEndpoint: {videoId: request.videoId},
        }),
      };
    case "song":
      return resolveSong(youtube, request);
    case "artist":
      return resolveArtist(youtube, request);
    case "album":
      return resolveAlbum(youtube, request);
    case "playlist":
      return resolvePlaylist(youtube, request);
    case "empty":
      // "Play more like this": the YouTube Music radio of the current track.
      if (request.currentlyPlaying && player.currentVideoId) {
        return {
          kind: "play",
          endpoint: new YTNodes.NavigationEndpoint({
            watchEndpoint: {
              videoId: player.currentVideoId,
              playlistId: `RDAMVM${player.currentVideoId}`,
            },
          }),
          via: "radio",
        };
      }
      // "Play ReactTube" continues what is loaded. After a cold start nothing
      // is, so restart the last track and fall back to the home feed only when
      // nothing was played yet.
      if (player.hasCurrentItem) {
        return {kind: "resume"};
      }
      if (player.lastPlayed) {
        return {
          kind: "play",
          endpoint: new YTNodes.NavigationEndpoint({
            watchEndpoint: {videoId: player.lastPlayed.videoId},
          }),
          title: player.lastPlayed.title,
          artist: player.lastPlayed.artist,
        };
      }
      return resolveHomeFeed(youtube);
  }
}
