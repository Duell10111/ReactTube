import {useCallback, useMemo} from "react";

import {useAppData} from "@/context/AppDataContext";
import {useTranslation} from "@/localization";
import {
  getSubtitleChoices,
  SubtitleTrack,
  SubtitleTrackList,
} from "@/utils/Subtitles";

/**
 * The display name of a track. API-provided names stay as they are; only
 * the translation wording is app copy.
 */
export function useSubtitleLabel() {
  const {t} = useTranslation();
  return useCallback(
    (track: SubtitleTrack) =>
      track.translation
        ? t("video.player.subtitles.translated", {
            language: track.name,
            source: track.translation.sourceName,
          })
        : track.name,
    [t],
  );
}

/** The languages translations are offered into. */
export function useSubtitleTranslationLanguages() {
  const {appSettings} = useAppData();
  const {language} = useTranslation();
  return useMemo(
    () => [
      language,
      appSettings.languageSelected,
      appSettings.subtitleLanguage,
    ],
    [appSettings.languageSelected, appSettings.subtitleLanguage, language],
  );
}

/** All tracks offered for a video, shared by the menu and the manifest. */
export function useSubtitleChoices(list: SubtitleTrackList | undefined) {
  const languages = useSubtitleTranslationLanguages();
  return useMemo(() => getSubtitleChoices(list, languages), [languages, list]);
}
