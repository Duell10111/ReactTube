import React from "react";
import {FlatList} from "react-native";

import {VideoMenuContainer} from "@/components/general/VideoMenuContainer";
import {VideoMenuTextItem} from "@/components/video/videoPlayer/settings/VideoMenuTextItem";
import {useAppData} from "@/context/AppDataContext";
import {useTranslation} from "@/localization";
import {AppText} from "@/ui/components";
import {
  parsePlayerResolution,
  playerResolutions,
  type PlayerResolution,
} from "@/utils/PlayerResolution";

export function VideoPlayerResolution() {
  const {appSettings, updateSettings} = useAppData();
  const {t} = useTranslation();
  const selected = parsePlayerResolution(appSettings);

  const renderItem = ({item}: {item: PlayerResolution}) => (
    <VideoMenuTextItem
      selected={selected.key === item.key}
      item={t(item.labelKey)}
      onPress={() => updateSettings(item.settings)}
    />
  );

  return (
    <VideoMenuContainer>
      <FlatList
        data={Object.values(playerResolutions)}
        keyExtractor={item => item.key}
        renderItem={renderItem}
        ListHeaderComponent={
          <AppText variant={"titleMedium"}>
            {t("settings.videoResolution")}
          </AppText>
        }
      />
    </VideoMenuContainer>
  );
}
