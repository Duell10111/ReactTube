import React from "react";
import {FlatList} from "react-native";

import {VideoMenuContainer} from "@/components/general/VideoMenuContainer";
import {VideoMenuTextItem} from "@/components/video/videoPlayer/settings/VideoMenuTextItem";
import {useVideoPlayerSettings} from "@/components/video/videoPlayer/settings/VideoPlayerSettingsContext";
import {
  SubtitleOption,
  useSubtitleOptions,
} from "@/hooks/video/useSubtitleOptions";
import {useTranslation} from "@/localization";
import {AppText} from "@/ui/components";

export function VideoPlayerSubtitles() {
  const {selectedSubtitle, selectSubtitle} = useVideoPlayerSettings();
  const {t} = useTranslation();
  const options = useSubtitleOptions();

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
