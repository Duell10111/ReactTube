import {Platform} from "react-native";
import TrackPlayer from "react-native-track-player";

import playbackService from "./MusicService";

export function setupMusicPlayer() {
  if (Platform.OS === "android") {
    TrackPlayer.setupPlayer().catch(() => {});
  }
  TrackPlayer.registerPlaybackService(() => playbackService);
}
