import {useNavigation} from "@react-navigation/native";
import React from "react";
import {FlatList} from "react-native";

import {VideoMenuContainer} from "@/components/general/VideoMenuContainer";
import {VideoMenuTextItem} from "@/components/video/videoPlayer/settings/VideoMenuTextItem";
import {useTranslation} from "@/localization";
import {RootNavProp} from "@/navigation/RootStackNavigator";
import {AppText} from "@/ui/components";

export function VideoPlayerSettings() {
  const navigation = useNavigation<RootNavProp>();
  const {t} = useTranslation();
  const options = [
    {
      title: t("video.player.speed"),
      screen: "VideoPlayerPlaySpeed" as const,
      iconName: "speed" as const,
    },
    {
      title: t("video.player.language"),
      screen: "VideoPlayerLanguage" as const,
      iconName: "audiotrack" as const,
    },
  ];

  const renderItem = ({item}: {item: (typeof options)[number]}) => {
    return (
      <VideoMenuTextItem
        item={item.title}
        iconName={item.iconName}
        onPress={() => navigation.navigate(item.screen)}
      />
    );
  };

  return (
    <VideoMenuContainer>
      <FlatList
        data={options}
        renderItem={renderItem}
        ListHeaderComponent={
          <AppText variant={"titleMedium"}>
            {t("video.player.settings")}
          </AppText>
        }
      />
    </VideoMenuContainer>
  );
}
