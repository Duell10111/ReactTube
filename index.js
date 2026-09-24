import {registerRootComponent} from "expo";

const App = require("./App").default;
const {setupMusicPlayer} = require("./src/utils/music/MusicInit");
const {
  registerMusicPlaybackSession,
} = require("./src/utils/music/MusicService");

if (setupMusicPlayer()) {
  registerMusicPlaybackSession();
}
registerRootComponent(App);
