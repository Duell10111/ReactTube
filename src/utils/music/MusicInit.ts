import TrackPlayer from "react-native-track-player";

import playbackService from "../MusicService";

export function setupMusicPlayer() {
  TrackPlayer.registerPlaybackService(() => playbackService);
}
