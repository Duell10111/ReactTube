import {
  getAllPlaylists,
  getDownloadedVideos,
} from "@/downloader/DownloadDatabaseOperations";
import type {SiriLibrary, SiriLibraryPlaylist} from "@/siri/matchSiriLibrary";

/**
 * Account playlists need a YouTube request, so useSiriLibrarySync loads them
 * once and keeps them here; local playlists and downloads are read fresh for
 * every request.
 */
let accountPlaylists: SiriLibraryPlaylist[] = [];

export function setSiriAccountPlaylists(playlists: SiriLibraryPlaylist[]) {
  accountPlaylists = playlists;
}

export async function loadSiriLibrary(): Promise<SiriLibrary> {
  const [playlists, downloads] = await Promise.all([
    getAllPlaylists(),
    getDownloadedVideos(),
  ]);
  return {
    playlists: [
      ...playlists.flatMap(playlist =>
        playlist.name
          ? [{id: playlist.id, title: playlist.name, source: "local" as const}]
          : [],
      ),
      ...accountPlaylists,
    ],
    downloads: downloads.flatMap(video =>
      video.name
        ? [
            {
              videoId: video.id,
              title: video.name,
              artist: video.author ?? undefined,
            },
          ]
        : [],
    ),
  };
}
