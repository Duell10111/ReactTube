import TrackPlayer, {PlayerCommand} from "@rntp/player";

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
    TrackPlayer.setCommands({
      // Next/Previous bleiben deaktiviert, solange die App nur den aktuellen
      // Titel nativ hält und die restliche Playlist ausschließlich in React lebt.
      capabilities: [PlayerCommand.PlayPause, PlayerCommand.Seek],
      handling: "native",
    });
    isMusicPlayerInitialized = true;
    return true;
  } catch (error) {
    LOGGER.error("Music player setup failed: ", error);
    return false;
  }
}
