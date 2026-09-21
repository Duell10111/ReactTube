import {registerRootComponent} from "expo";

const showDesignSpike =
  __DEV__ && process.env.EXPO_PUBLIC_UI_DESIGN_SPIKE === "true";
const showUIPrimitivesDemo =
  __DEV__ && process.env.EXPO_PUBLIC_UI_PRIMITIVES_DEMO === "true";

if (showUIPrimitivesDemo) {
  const UIPrimitivesDemoApp =
    require("./src/ui/experimental/UIPrimitivesDemoApp").default;

  registerRootComponent(UIPrimitivesDemoApp);
} else if (showDesignSpike) {
  const DesignSpikeApp =
    require("./src/ui/experimental/DesignSpikeApp").default;

  registerRootComponent(DesignSpikeApp);
} else {
  const App = require("./App").default;
  const {setupMusicPlayer} = require("./src/utils/music/MusicInit");
  const {
    registerMusicPlaybackSession,
  } = require("./src/utils/music/MusicService");

  if (setupMusicPlayer()) {
    registerMusicPlaybackSession();
  }
  registerRootComponent(App);
}
