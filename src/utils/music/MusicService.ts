import TrackPlayer, {Event} from "@rntp/player";

import LOGGER from "../Logger";

let isPlaybackSessionRegistered = false;

export default function musicPlaybackSession(): void {
  // Play/Pause und Seek werden über setCommands nativ ausgeführt, Next/Previous
  // beantwortet der MusicPlayerContext in JS, weil nur er die Playlist kennt.
  // Ohne gemounteten React-Baum (z. B. nach dem Wegwischen der App) bleiben
  // deshalb nur die nativen Kommandos; die Session bleibt für Diagnose da.
  TrackPlayer.addEventListener(Event.PlaybackError, ({code, message}) => {
    LOGGER.error(`Music playback failed (${code}): ${message}`);
  });
}

export function registerMusicPlaybackSession(): void {
  if (isPlaybackSessionRegistered) {
    return;
  }

  try {
    TrackPlayer.registerPlaybackSession(musicPlaybackSession);
    isPlaybackSessionRegistered = true;
  } catch (error) {
    LOGGER.error("Music playback session registration failed: ", error);
  }
}
