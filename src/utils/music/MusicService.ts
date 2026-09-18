import TrackPlayer, {Event} from "@rntp/player";

import LOGGER from "../Logger";

let isPlaybackSessionRegistered = false;

export default function musicPlaybackSession(): void {
  // Play/Pause und Seek werden über setCommands nativ ausgeführt. Die
  // prozessweite Session bleibt für Diagnose verfügbar, wenn kein React-Baum
  // gemountet ist (z. B. während reiner Hintergrundwiedergabe).
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
