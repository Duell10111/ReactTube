import React from "react";
import {FlatList, Text} from "react-native";

import {VideoMenuContainer} from "@/components/general/VideoMenuContainer";
import {VideoMenuTextItem} from "@/components/video/videoPlayer/settings/VideoMenuTextItem";
import {useVideoPlayerSettings} from "@/components/video/videoPlayer/settings/VideoPlayerSettingsContext";

export function VideoPlayerLanguage() {
  const {languages, selectedLanguage, selectLanguage} =
    useVideoPlayerSettings();

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
          <Text
            style={{
              color: "white",
              fontSize: 25,
              fontWeight: "bold",
              marginBottom: 10,
            }}>
            {"Languages"}
          </Text>
        }
      />
    </VideoMenuContainer>
  );
}
