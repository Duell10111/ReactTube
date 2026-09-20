import TrackPlayer, {Event} from "@rntp/player";

import LOGGER from "../Logger";

let isPlaybackSessionRegistered = false;

function runPlayerCommand(name: string, command: () => void): void {
  try {
    command();
  } catch (error) {
    LOGGER.error(`Music player ${name} command failed: `, error);
  }
}

export default function musicPlaybackSession(): void {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    runPlayerCommand("play", TrackPlayer.play);
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    runPlayerCommand("pause", TrackPlayer.pause);
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, ({position}) => {
    runPlayerCommand("seek", () => TrackPlayer.seekTo(position));
  });

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
