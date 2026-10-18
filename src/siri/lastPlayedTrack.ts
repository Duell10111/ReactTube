import {createMMKV} from "react-native-mmkv";

/**
 * The music player keeps nothing across app launches, so "resume ReactTube"
 * after a cold start needs its own memory of the last track.
 */
export interface SiriLastPlayedTrack {
  videoId: string;
  title: string;
  artist?: string;
}

const storage = createMMKV({id: "siri"});
const KEY = "lastPlayedTrack";

export function getLastPlayedTrack(): SiriLastPlayedTrack | undefined {
  const value = storage.getString(KEY);
  if (!value) {
    return undefined;
  }
  try {
    return JSON.parse(value) as SiriLastPlayedTrack;
  } catch {
    return undefined;
  }
}

export function setLastPlayedTrack(track: SiriLastPlayedTrack) {
  storage.set(KEY, JSON.stringify(track));
}
