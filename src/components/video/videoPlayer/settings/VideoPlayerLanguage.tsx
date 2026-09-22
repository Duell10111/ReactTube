import React from "react";
import {FlatList} from "react-native";

import {VideoMenuContainer} from "@/components/general/VideoMenuContainer";
import {VideoMenuTextItem} from "@/components/video/videoPlayer/settings/VideoMenuTextItem";
import {useVideoPlayerSettings} from "@/components/video/videoPlayer/settings/VideoPlayerSettingsContext";
import {useTranslation} from "@/localization";
import {AppText} from "@/ui/components";

export function VideoPlayerLanguage() {
  const {languages, selectedLanguage, selectLanguage} =
    useVideoPlayerSettings();
  const {t} = useTranslation();

  // Use self selected item or item information if not present
  const selectedItem = selectedLanguage ?? languages.find(l => l.selected);

  const renderItem = ({item}: {item: (typeof languages)[number]}) => {
    return (
      <VideoMenuTextItem
        selected={selectedItem?.index === item.index}
        item={`${item.title ?? item.language ?? item.index}`}
        onPress={() => selectLanguage(item)}
      />
    );
  };

  return (
    <VideoMenuContainer>
      <FlatList
        data={languages}
        renderItem={renderItem}
        ListHeaderComponent={
          <AppText variant={"titleMedium"}>
            {t("video.player.language")}
          </AppText>
        }
      />
    </VideoMenuContainer>
  );
}
