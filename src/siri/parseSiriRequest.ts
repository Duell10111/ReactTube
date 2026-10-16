import {normalizeSiriQuery} from "./normalizeSiriQuery.ts";
import type {SiriMediaRequest} from "../../modules/siri-media/src/SiriMedia.types.ts";

/** Raw `INMediaItemType` values, see Intents/INMediaItemType.h. */
export const SiriMediaType = {
  unknown: 0,
  song: 1,
  album: 2,
  artist: 3,
  genre: 4,
  playlist: 5,
  musicStation: 9,
  musicVideo: 14,
  radioStation: 16,
  station: 17,
  music: 18,
  algorithmicRadioStation: 19,
} as const;

/** Raw `INMediaReference` values. */
const SiriMediaReference = {
  currentlyPlaying: 1,
} as const;

/** Identifier prefix of items the app donated through `donatePlayback`. */
export const DONATED_VIDEO_PREFIX = "rt:video:";

export type SiriPlayRequest =
  /** An item ReactTube donated earlier; Siri hands it back as is. */
  | {kind: "donated"; videoId: string}
  | {kind: "song"; query: string; title: string; artist?: string}
  | {kind: "artist"; query: string; artist: string}
  | {kind: "album"; query: string; album: string; artist?: string}
  | {kind: "playlist"; query: string; playlist: string}
  /** "Play ReactTube" or "play more like this": nothing specific asked for. */
  | {kind: "empty"; currentlyPlaying: boolean};

export interface SiriSearchRequest {
  kind: "search";
  query: string;
  /** Video hints ("videos of …", music videos) open the video search. */
  target: "music" | "video";
}

export type ParsedSiriRequest = SiriPlayRequest | SiriSearchRequest;

function joinQuery(...parts: (string | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function parseSiriRequest(request: SiriMediaRequest): ParsedSiriRequest {
  const name = normalizeSiriQuery(request.mediaName);
  const artist = normalizeSiriQuery(request.artistName);
  const album = normalizeSiriQuery(request.albumName);
  const moods = (request.moodNames ?? []).map(normalizeSiriQuery);
  const genres = (request.genreNames ?? []).map(normalizeSiriQuery);
  const type = request.mediaType ?? SiriMediaType.unknown;

  if (request.intent === "search") {
    const query = joinQuery(name, artist, album, ...genres, ...moods);
    return {
      kind: "search",
      query,
      target: type === SiriMediaType.musicVideo ? "video" : "music",
    };
  }

  if (request.itemIdentifier?.startsWith(DONATED_VIDEO_PREFIX)) {
    const videoId = request.itemIdentifier.slice(DONATED_VIDEO_PREFIX.length);
    if (videoId) {
      return {kind: "donated", videoId};
    }
  }

  if (type === SiriMediaType.artist && (artist ?? name)) {
    const artistName = (artist ?? name)!;
    return {kind: "artist", query: artistName, artist: artistName};
  }

  if (type === SiriMediaType.album && (album ?? name)) {
    const albumName = (album ?? name)!;
    return {
      kind: "album",
      query: joinQuery(albumName, artist),
      album: albumName,
      artist,
    };
  }

  if (type === SiriMediaType.playlist && name) {
    return {kind: "playlist", query: name, playlist: name};
  }

  if (name) {
    return {kind: "song", query: joinQuery(name, artist), title: name, artist};
  }

  // Only an artist or album without a type, e.g. "play something by Queen".
  if (artist && !album) {
    return {kind: "artist", query: artist, artist};
  }
  if (album) {
    return {kind: "album", query: joinQuery(album, artist), album, artist};
  }

  // Genres and moods ("play relaxing jazz") have no dedicated handling yet and
  // are searched as songs.
  const genreQuery = joinQuery(...genres, ...moods);
  if (genreQuery) {
    return {kind: "song", query: genreQuery, title: genreQuery};
  }

  return {
    kind: "empty",
    currentlyPlaying: request.reference === SiriMediaReference.currentlyPlaying,
  };
}
