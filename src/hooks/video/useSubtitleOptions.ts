import {useMemo} from "react";

import {useVideoPlayerSettings} from "@/components/video/videoPlayer/settings/VideoPlayerSettingsContext";
import {
  useSubtitleChoices,
  useSubtitleLabel,
} from "@/hooks/video/useSubtitleChoices";
import {useTranslation} from "@/localization";
import {SubtitleTrack} from "@/utils/Subtitles";

export interface SubtitleOption {
  key: string;
  label: string;
  /** `undefined` is the "off" entry. */
  track?: SubtitleTrack;
}

/**
 * The subtitle entries a player menu offers for the current video: "off"
 * first, then every choice. Shared by the TV menu and the phone settings
 * sheet so both list the same tracks.
 */
export function useSubtitleOptions(): SubtitleOption[] {
  const {subtitles, selectedSubtitle} = useVideoPlayerSettings();
  const {t} = useTranslation();
  const choices = useSubtitleChoices(subtitles);
  const label = useSubtitleLabel();

  return useMemo<SubtitleOption[]>(() => {
    if (!subtitles) {
      return [];
    }
    const tracks = [...choices];
    // Keep a translation chosen earlier listed even if no offer covers it.
    if (
      selectedSubtitle &&
      !tracks.some(track => track.id === selectedSubtitle.id)
    ) {
      tracks.push(selectedSubtitle);
    }
    return [
      {key: "off", label: t("video.player.subtitles.off")},
      ...tracks.map(track => ({key: track.id, track, label: label(track)})),
    ];
  }, [choices, label, selectedSubtitle, subtitles, t]);
}
