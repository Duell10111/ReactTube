import React, {createContext, useContext, useState} from "react";

interface Language {
  index: number;
  title?: string;
  language?: string;
  selected?: boolean;
}

interface VideoPlayerSettings {
  speed?: number;
  setSpeed?: (speed: number) => void;
  languages: Language[];
  setLanguages: (languages: Language[]) => void;
  selectedLanguage?: Language;
  selectLanguage: (language: Language) => void;
}

const VideoPlayerSettingsCtx = createContext<VideoPlayerSettings>({
  setLanguages: () => console.warn("No context provider found"),
  languages: [],
  selectLanguage: () => console.warn("No context provider found"),
});

export function VideoPlayerSettingsContext({
  children,
}: {
  children: React.ReactNode;
}) {
  const [speed, setSpeed] = useState(1);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<
    Language | undefined
  >(undefined);

  return (
    <VideoPlayerSettingsCtx.Provider
      value={{
        speed,
        setSpeed,
        languages,
        setLanguages,
        selectLanguage: setSelectedLanguage,
        selectedLanguage,
      }}>
      {children}
    </VideoPlayerSettingsCtx.Provider>
  );
}

export function useVideoPlayerSettings() {
  return useContext(VideoPlayerSettingsCtx);
}
