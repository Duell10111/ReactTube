import React from "react";
import {FlatList} from "react-native";

import {VideoMenuContainer} from "@/components/general/VideoMenuContainer";
import {VideoMenuTextItem} from "@/components/video/videoPlayer/settings/VideoMenuTextItem";
import {useVideoPlayerSettings} from "@/components/video/videoPlayer/settings/VideoPlayerSettingsContext";
import {useTranslation} from "@/localization";
import {AppText} from "@/ui/components";

const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export function VideoPlayerSpeed() {
  const {speed, setSpeed} = useVideoPlayerSettings();
  const {t} = useTranslation();

  const renderItem = ({item}: {item: number}) => {
    return (
      <VideoMenuTextItem
        selected={speed === item}
        item={`${item}x`}
        onPress={() => setSpeed?.(item)}
      />
    );
  };

  return (
    <VideoMenuContainer>
      <FlatList
        data={speeds}
        renderItem={renderItem}
        ListHeaderComponent={
          <AppText variant={"titleMedium"}>{t("video.player.speeds")}</AppText>
        }
      />
    </VideoMenuContainer>
  );
}
