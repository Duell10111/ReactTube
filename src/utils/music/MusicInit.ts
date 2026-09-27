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
      capabilities: [
        PlayerCommand.PlayPause,
        PlayerCommand.Seek,
        PlayerCommand.Next,
        PlayerCommand.Previous,
      ],
      // Play/Pause und Seek bleiben nativ, damit sie ohne JS funktionieren.
      // Next/Previous müssen dagegen nach JS, weil nativ nur der aktuelle Titel
      // liegt und die Playlist samt Repeat, Shuffle und Automix in React lebt.
      handling: "hybrid",
      perCommandHandling: {
        [PlayerCommand.Next]: "js",
        [PlayerCommand.Previous]: "js",
      },
    });
    isMusicPlayerInitialized = true;
    return true;
  } catch (error) {
    LOGGER.error("Music player setup failed: ", error);
    return false;
  }
}
