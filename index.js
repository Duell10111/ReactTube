import {registerRootComponent} from "expo";

import App from "./App";
import {setupMusicPlayer} from "./src/utils/music/MusicInit";
import {registerMusicPlaybackSession} from "./src/utils/music/MusicService";

if (setupMusicPlayer()) {
  registerMusicPlaybackSession();
}
registerRootComponent(App);
