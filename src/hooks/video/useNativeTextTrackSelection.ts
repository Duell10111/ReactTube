import {useMemo} from "react";
import {SelectedTrack, SelectedTrackType} from "react-native-video";

import {useAppData} from "@/context/AppDataContext";
import {useSubtitleLabel} from "@/hooks/video/useSubtitleChoices";
import type {PlaybackSourceKind} from "@/utils/PlaybackLadder";
import {
  getNativeTextTrackSelection,
  pickSubtitleTrack,
  SubtitleTrackList,
} from "@/utils/Subtitles";

/**
 * Starts the native player on the subtitle track the user chose in the app.
 *
 * Only HLS sources carry subtitle renditions: the generated manifest gets
 * every track, YouTube's own manifest lists the manual ones. Progressive
 * files have none.
 */
export function useNativeTextTrackSelection(
  list: SubtitleTrackList | undefined,
  sourceKind: PlaybackSourceKind | undefined,
): SelectedTrack | undefined {
  const {appSettings} = useAppData();
  const label = useSubtitleLabel();

  return useMemo(() => {
    if (sourceKind !== "generated-hls" && sourceKind !== "youtube-hls") {
      return undefined;
    }
    const preference = {
      enabled: appSettings.subtitlesEnabled,
      languageCode: appSettings.subtitleLanguage,
    };
    const selection = getNativeTextTrackSelection(
      pickSubtitleTrack(list, preference),
      preference,
      sourceKind === "generated-hls" ? "title" : "language",
      label,
    );
    if (!selection) {
      return undefined;
    }
    return selection.type === "disabled"
      ? {type: SelectedTrackType.DISABLED}
      : {
          type:
            selection.type === "title"
              ? SelectedTrackType.TITLE
              : SelectedTrackType.LANGUAGE,
          value: selection.value,
        };
  }, [
    appSettings.subtitleLanguage,
    appSettings.subtitlesEnabled,
    label,
    list,
    sourceKind,
  ]);
}
