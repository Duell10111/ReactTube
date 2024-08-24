import {Platform} from "react-native";
import TrackPlayer, {Event} from "react-native-track-player";

export default async function playbackService() {
  console.log("Setup Player");
  if (Platform.OS === "ios") {
    await TrackPlayer.setupPlayer({
      autoHandleInterruptions: true,
    });
  }

  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());

  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());

  TrackPlayer.addEventListener(Event.RemotePrevious, () =>
    TrackPlayer.skipToPrevious(),
  );

  TrackPlayer.addEventListener(Event.RemoteJumpForward, event =>
    TrackPlayer.seekTo(event.interval),
  );

  TrackPlayer.addEventListener(Event.RemoteJumpBackward, event =>
    TrackPlayer.seekTo(event.interval),
  );
}
