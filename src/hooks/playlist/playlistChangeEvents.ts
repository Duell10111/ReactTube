/**
 * Notifies interested parties (e.g. the watch playlist sync) after the app
 * changed a playlist. YouTube playlists have no push channel, so this is how
 * edits made in the app reach linked copies right away.
 */
type Listener = (playlistId: string) => void;

const listeners = new Set<Listener>();

export function notifyPlaylistChanged(playlistId: string) {
  listeners.forEach(listener => listener(playlistId));
}

export function addPlaylistChangeListener(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
