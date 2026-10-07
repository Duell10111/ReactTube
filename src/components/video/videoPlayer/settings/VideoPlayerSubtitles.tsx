import React, {useMemo} from "react";
import {FlatList} from "react-native";

import {VideoMenuContainer} from "@/components/general/VideoMenuContainer";
import {VideoMenuTextItem} from "@/components/video/videoPlayer/settings/VideoMenuTextItem";
import {useVideoPlayerSettings} from "@/components/video/videoPlayer/settings/VideoPlayerSettingsContext";
import {
  useSubtitleChoices,
  useSubtitleLabel,
} from "@/hooks/video/useSubtitleChoices";
import {useTranslation} from "@/localization";
import {AppText} from "@/ui/components";
import {SubtitleTrack} from "@/utils/Subtitles";

interface SubtitleOption {
  key: string;
  label: string;
  track?: SubtitleTrack;
}

export function VideoPlayerSubtitles() {
  const {subtitles, selectedSubtitle, selectSubtitle} =
    useVideoPlayerSettings();
  const {t} = useTranslation();
  const choices = useSubtitleChoices(subtitles);
  const label = useSubtitleLabel();

  const options = useMemo<SubtitleOption[]>(() => {
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

  const renderItem = ({item}: {item: SubtitleOption}) => (
    <VideoMenuTextItem
      selected={selectedSubtitle?.id === item.track?.id}
      item={item.label}
      onPress={() => selectSubtitle(item.track)}
    />
  );

  return (
    <VideoMenuContainer>
      <FlatList
        data={options}
        keyExtractor={item => item.key}
        renderItem={renderItem}
        ListHeaderComponent={
          <AppText variant={"titleMedium"}>
            {t("video.player.subtitles")}
          </AppText>
        }
        ListEmptyComponent={
          <AppText variant={"body"}>{t("video.player.subtitles.none")}</AppText>
        }
      />
    </VideoMenuContainer>
  );
}
