import React, {createContext, useContext, useState} from "react";

interface VideoPlayerSettings {
  speed?: number;
  setSpeed?: (speed: number) => void;
}

const VideoPlayerSettingsCtx = createContext<VideoPlayerSettings>({});

export function VideoPlayerSettingsContext({
  children,
}: {
  children: React.ReactNode;
}) {
  const [speed, setSpeed] = useState(1);

  return (
    <VideoPlayerSettingsCtx.Provider value={{speed, setSpeed}}>
      {children}
    </VideoPlayerSettingsCtx.Provider>
  );
}

export function useVideoPlayerSettings() {
  return useContext(VideoPlayerSettingsCtx);
}
