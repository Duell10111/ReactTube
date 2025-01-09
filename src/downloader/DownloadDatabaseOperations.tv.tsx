// Empty file

// TV Mock for migrations
export function useMigration() {
  return {success: true, error: undefined};
}

export async function insertVideo(
  id: string,
  name: string,
  dirURL: string,
  playlistID?: string,
) {
  console.warn("Used empty TV variant of insertVideo");
}

export function usePlaylistVideos(id: string) {
  return [];
}

export function usePlaylists() {
  return [];
}
