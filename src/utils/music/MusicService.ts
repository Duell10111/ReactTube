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

  // TrackPlayer.addEventListener(Event.RemotePrevious, () =>
  //   TrackPlayer.skipToPrevious(),
  // );

  TrackPlayer.addEventListener(Event.RemoteSeek, event =>
    TrackPlayer.seekTo(event.position),
  );
}
