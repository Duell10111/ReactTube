import {Platform} from "react-native";
import {AudioPro, AudioProContentType} from "react-native-audio-pro";
import TrackPlayer from "react-native-track-player";

import playbackService from "./MusicService";

export function setupMusicPlayer() {
  AudioPro.configure({
    contentType: AudioProContentType.MUSIC,
    debug: __DEV__,
  });

  // if (Platform.OS === "android") {
  //   TrackPlayer.setupPlayer().catch(() => {});
  // }
  // TrackPlayer.registerPlaybackService(() => playbackService);
}
