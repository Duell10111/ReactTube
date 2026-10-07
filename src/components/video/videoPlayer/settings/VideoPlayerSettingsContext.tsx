import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

import {useAppData} from "@/context/AppDataContext";
import {
  pickSubtitleTrack,
  SubtitleTrack,
  SubtitleTrackList,
} from "@/utils/Subtitles";

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
  /** Caption tracks of the video in the player, if it has any. */
  subtitles?: SubtitleTrackList;
  /** Publishes a video's tracks and picks one from the saved preference. */
  setSubtitles: (subtitles: SubtitleTrackList | undefined) => void;
  selectedSubtitle?: SubtitleTrack;
  /** `undefined` turns subtitles off. The choice is kept for later videos. */
  selectSubtitle: (track: SubtitleTrack | undefined) => void;
}

const VideoPlayerSettingsCtx = createContext<VideoPlayerSettings>({
  setLanguages: () => console.warn("No context provider found"),
  languages: [],
  selectLanguage: () => console.warn("No context provider found"),
  setSubtitles: () => console.warn("No context provider found"),
  selectSubtitle: () => console.warn("No context provider found"),
});

export function VideoPlayerSettingsContext({
  children,
}: {
  children: React.ReactNode;
}) {
  const {appSettings, updateSettings} = useAppData();
  const [speed, setSpeed] = useState(1);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<
    Language | undefined
  >(undefined);
  const [subtitles, setSubtitleList] = useState<SubtitleTrackList>();
  const [selectedSubtitle, setSelectedSubtitle] = useState<SubtitleTrack>();

  // Read at the moment a video arrives, so a settings change does not
  // re-run the automatic choice in the middle of a video.
  const preferenceRef = useRef(appSettings);
  preferenceRef.current = appSettings;

  const setSubtitles = useCallback((list: SubtitleTrackList | undefined) => {
    setSubtitleList(list);
    setSelectedSubtitle(
      pickSubtitleTrack(list, {
        enabled: preferenceRef.current.subtitlesEnabled,
        languageCode: preferenceRef.current.subtitleLanguage,
      }),
    );
  }, []);

  const selectSubtitle = useCallback(
    (track: SubtitleTrack | undefined) => {
      setSelectedSubtitle(track);
      updateSettings(
        track
          ? {subtitlesEnabled: true, subtitleLanguage: track.languageCode}
          : {subtitlesEnabled: false},
      );
    },
    [updateSettings],
  );

  return (
    <VideoPlayerSettingsCtx.Provider
      value={{
        speed,
        setSpeed,
        languages,
        setLanguages,
        selectLanguage: setSelectedLanguage,
        selectedLanguage,
        subtitles,
        setSubtitles,
        selectedSubtitle,
        selectSubtitle,
      }}>
      {children}
    </VideoPlayerSettingsCtx.Provider>
  );
}

export function useVideoPlayerSettings() {
  return useContext(VideoPlayerSettingsCtx);
}
