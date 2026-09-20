import TrackPlayer from "@rntp/player";

import LOGGER from "../Logger";

let isMusicPlayerInitialized = false;

export function setupMusicPlayer(): boolean {
  if (isMusicPlayerInitialized) {
    return true;
  }

  try {
    TrackPlayer.setupPlayer({
      contentType: "music",
      handleAudioBecomingNoisy: true,
      audioMixing: "exclusive",
      android: {
        wakeMode: "network",
      },
    });
    isMusicPlayerInitialized = true;
    return true;
  } catch (error) {
    LOGGER.error("Music player setup failed: ", error);
    return false;
  }
}
