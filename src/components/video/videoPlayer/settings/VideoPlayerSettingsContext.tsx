import {usePreventRemove} from "@react-navigation/native";
import React, {createContext, useContext} from "react";
import {Modal} from "react-native";

import {VideoPlayerSettingsNavigator} from "@/components/video/videoPlayer/settings/VideoPlayerSettingsNavigator";

interface VideoPlayerSettings {
  speed?: number;
  showSettings: () => void;
}

const VideoPlayerSettingsCtx = createContext<VideoPlayerSettings>({
  showSettings: () => {},
});

export function VideoPlayerSettingsContext({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showSettings, setShowSettings] = React.useState(false);

  // Disable screen removal on main navigator
  usePreventRemove(showSettings, () => {
    setShowSettings(false);
  });

  return (
    <VideoPlayerSettingsCtx.Provider
      value={{speed: 1, showSettings: () => setShowSettings(true)}}>
      <Modal
        visible={showSettings}
        onRequestClose={() => setShowSettings(false)}
        transparent>
        <VideoPlayerSettingsNavigator />
      </Modal>
      {children}
    </VideoPlayerSettingsCtx.Provider>
  );
}

export function useVideoPlayerSettings() {
  return useContext(VideoPlayerSettingsCtx);
}
