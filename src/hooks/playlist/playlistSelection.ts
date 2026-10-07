/**
 * Playlist ids arrive with and without the `VL` browse prefix depending on
 * the response they come from; membership has to compare them without it.
 */
export function normalizePlaylistId(playlistId: string): string {
  return playlistId.startsWith("VL") ? playlistId.slice(2) : playlistId;
}

export interface PlaylistSelectionChanges {
  add: string[];
  remove: string[];
}

/**
 * What has to change when the save dialog closes. Playlists that already
 * contained the video are not added again: YouTube playlists accept
 * duplicates, so re-adding would list the video twice.
 */
export function diffPlaylistSelection(
  initial: Iterable<string>,
  selected: Iterable<string>,
): PlaylistSelectionChanges {
  const before = new Set(Array.from(initial, normalizePlaylistId));
  const after = new Set(Array.from(selected, normalizePlaylistId));

  return {
    add: [...after].filter(id => !before.has(id)),
    remove: [...before].filter(id => !after.has(id)),
  };
}
