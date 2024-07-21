import TrackPlayer, {Event} from "react-native-track-player";

export default async function playbackService() {
  await TrackPlayer.setupPlayer({
    autoHandleInterruptions: true,
  });

  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());

  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
}
