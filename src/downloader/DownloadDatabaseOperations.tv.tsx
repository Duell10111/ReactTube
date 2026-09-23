// Empty file

// TV Mock for migrations
export function useDatabaseMigration() {
  return {
    phase: "ready" as const,
    success: true,
    error: undefined,
    diagnostics: undefined,
    recovered: false,
    retry: () => {},
    repair: () => {},
    reset: () => {},
  };
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
