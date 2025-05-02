import _ from "lodash";

import {isLocalPlaylist} from "@/downloader/DBData";
import useLocalPlaylistManager from "@/hooks/playlist/useLocalPlaylistManager";
import useYTServerPlaylistManager from "@/hooks/playlist/useYTServerPlaylistManager";

export function combineLocalWithServerPlaylistManager(
  server: ReturnType<typeof useYTServerPlaylistManager>,
  local: ReturnType<typeof useLocalPlaylistManager>,
) {
  const playlists = _.concat(local.playlists, server.playlists ?? []);

  return {
    playlists,
    fetchPlaylists: async () => {
      await Promise.all([server.fetchPlaylists(), local.fetchPlaylists()]);
    },
    saveVideoToPlaylist: async (videoIds: string[], playlistId: string) => {
      if (isLocalPlaylist(playlistId)) {
        await local.saveVideoToPlaylist(videoIds, playlistId);
      } else {
        await server.saveVideoToPlaylist(videoIds, playlistId);
      }
    },
    removeVideoFromPlaylist: async (videoIds, playlistId) => {
      if (isLocalPlaylist(playlistId)) {
        await local.removeVideoFromPlaylist(videoIds, playlistId);
      } else {
        await server.removeVideoFromPlaylist(videoIds, playlistId);
      }
    },
    // Redirect to server component
    createPlaylist: server.createPlaylist,
    fetchMorePlaylists: server.fetchMorePlaylists,
    executeNavEndpoint: server.executeNavEndpoint,
    addPlaylistToLibrary: server.addPlaylistToLibrary,
    removePlaylistFromLibrary: server.removePlaylistFromLibrary,
  } as ReturnType<typeof useYTServerPlaylistManager>;
}
