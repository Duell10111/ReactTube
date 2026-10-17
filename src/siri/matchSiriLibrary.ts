import type {SiriPlayRequest} from "./parseSiriRequest.ts";
import {
  normalizeForMatch,
  scoreSiriCandidate,
} from "./rankSiriSearchResults.ts";

export interface SiriLibraryPlaylist {
  id: string;
  title: string;
  /** `local`: stored in the app's database; `account`: the YouTube account. */
  source: "local" | "account";
}

export interface SiriLibraryDownload {
  videoId: string;
  title: string;
  artist?: string;
}

/** What the user has in ReactTube, as far as Siri requests can refer to it. */
export interface SiriLibrary {
  playlists: SiriLibraryPlaylist[];
  downloads: SiriLibraryDownload[];
}

export type SiriLibraryMatch =
  | {kind: "playlist"; playlist: SiriLibraryPlaylist}
  | {kind: "download"; download: SiriLibraryDownload};

/**
 * Exact title, or an exact title with a matching artist; looser matches would
 * replace a good YouTube result with an unrelated download.
 */
const MIN_DOWNLOAD_SCORE = 100;

/** Words Siri leaves in front of a playlist name ("my playlist Sport"). */
const PLAYLIST_FILLER =
  /^(?:(?:my|meine?n?|the|die|der|das)\s+)?(?:playlist\s+)?/;

/**
 * Words without a trailing "s": Siri drops possessives ("Today Hardstyle" for
 * "Today's Hardstyle"), and plural forms should not decide a match.
 */
function playlistWords(value: string) {
  return normalizeForMatch(value.replace(/['’]/g, ""))
    .replace(PLAYLIST_FILLER, "")
    .split(" ")
    .filter(Boolean)
    .map(word => (word.length > 3 ? word.replace(/s$/, "") : word));
}

/**
 * How well a playlist title fits the spoken name, or 0 for no match:
 * - same words in any order (Siri swaps them): best;
 * - all words of a title with at least two words occur in what was spoken:
 *   Siri adds words it misheard ("Today's Hits Hardstyle" for "Today's
 *   Hardstyle"). One-word titles must match exactly, otherwise a playlist
 *   called "Hits" would catch every request containing "hits".
 */
function playlistScore(spoken: string[], title: string[]) {
  if (!title.length || !spoken.length) {
    return 0;
  }
  const spokenSet = new Set(spoken);
  const titleSet = new Set(title);
  const sameWords =
    spokenSet.size === titleSet.size &&
    [...titleSet].every(word => spokenSet.has(word));
  if (sameWords) {
    return 1000;
  }
  if (titleSet.size >= 2 && [...titleSet].every(word => spokenSet.has(word))) {
    // More matched words: the more specific playlist.
    return titleSet.size * 10;
  }
  return 0;
}

function findPlaylist(library: SiriLibrary, name: string) {
  const spoken = playlistWords(name);
  let best: SiriLibraryPlaylist | undefined;
  let bestScore = 0;
  for (const playlist of library.playlists) {
    // Local playlists win ties: they were made in ReactTube on purpose.
    const score =
      playlistScore(spoken, playlistWords(playlist.title)) +
      (playlist.source === "local" ? 1 : 0);
    if (score > 1 && score > bestScore) {
      best = playlist;
      bestScore = score;
    }
  }
  return best;
}

function findDownload(
  library: SiriLibrary,
  title: string,
  artist: string | undefined,
) {
  let best: SiriLibraryDownload | undefined;
  let bestScore = MIN_DOWNLOAD_SCORE - 1;
  for (const download of library.downloads) {
    const score = scoreSiriCandidate(
      {title, artist},
      {
        title: download.title,
        artists: download.artist ? [download.artist] : [],
        type: "song",
      },
    );
    if (score > bestScore) {
      best = download;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Looks the request up in the user's playlists and downloads before searching
 * YouTube. A download is preferred whenever it clearly is what was asked for:
 * it also plays offline.
 */
export function matchSiriLibrary(
  request: SiriPlayRequest,
  library: SiriLibrary,
): SiriLibraryMatch | undefined {
  switch (request.kind) {
    case "playlist": {
      const playlist = findPlaylist(library, request.playlist);
      return playlist && {kind: "playlist", playlist};
    }
    case "song": {
      // Siri often reports a playlist name without the playlist type.
      const playlist = request.artist
        ? undefined
        : findPlaylist(library, request.title);
      if (playlist) {
        return {kind: "playlist", playlist};
      }
      const download = findDownload(library, request.title, request.artist);
      return download && {kind: "download", download};
    }
    default:
      return undefined;
  }
}
