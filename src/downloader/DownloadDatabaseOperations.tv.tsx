// TV variant: the local database is not available on TV. Every export of the
// phone module needs a counterpart here, because a missing one only fails at
// runtime as "undefined is not a function" (checked by `npm run
// typecheck:platforms`). Reads return nothing, writes reject with a clear error.
import type {Playlist, Video} from "./schema";

function unavailable(name: string): never {
  throw new Error(`${name} is not available on TV: there is no local database`);
}

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

export async function getAllPlaylists() {
  return [];
}

export async function getDownloadedVideos() {
  return [];
}

export function useVideos(): Video[] {
  return [];
}

export function useDownloadedVideos(): Video[] {
  return [];
}

export async function findVideo(_id: string): Promise<Video | undefined> {
  return undefined;
}

export async function checkIfVideoIsInPlaylist(_id: string) {
  return false;
}

export async function getPlaylist(_id: string): Promise<Playlist> {
  return unavailable("getPlaylist");
}

export async function getPlaylistVideos(_id: string): Promise<Video[]> {
  return [];
}

export async function createPlaylist(
  _id: string,
  _name: string,
  _description?: string,
  _coverUrl?: string,
) {
  unavailable("createPlaylist");
}

export async function deletePlaylist(_id: string) {
  unavailable("deletePlaylist");
}

export async function insertVideosIntoPlaylist(
  _playlistID: string,
  _videoIds: string[],
) {
  unavailable("insertVideosIntoPlaylist");
}

export async function removeVideosIntoPlaylist(
  _playlistID: string,
  _videoIds: string[],
) {
  unavailable("removeVideosIntoPlaylist");
}

export async function setPlaylistOrder(
  _playlistID: string,
  _videoIds: string[],
) {
  unavailable("setPlaylistOrder");
}

export async function deleteVideo(_id: string) {
  unavailable("deleteVideo");
}

export async function deleteVideoLocalFileReferences(
  _id: string,
  _coverURLReplacement?: string,
) {
  unavailable("deleteVideoLocalFileReferences");
}
