import {useNavigation} from "@react-navigation/native";
import React from "react";
import {FlatList, Text} from "react-native";

import {VideoMenuContainer} from "@/components/general/VideoMenuContainer";
import {VideoMenuTextItem} from "@/components/video/videoPlayer/settings/VideoMenuTextItem";
import {RootNavProp, RootStackParamList} from "@/navigation/RootStackNavigator";

//@ts-expect-error Ignore option error as screen option not recognized correctly
const options: [
  {
    title: string;
    screen: keyof RootStackParamList;
    iconType?: string;
    iconName?: string;
  },
] = [
  {
    title: "Playback Speed",
    screen: "VideoPlayerPlaySpeed",
    iconType: "MaterialIcons",
    iconName: "speed",
  },
  {
    title: "Video Language",
    screen: "VideoPlayerLanguage",
    iconType: "MaterialIcons",
    iconName: "audiotrack",
  },
];

export function VideoPlayerSettings() {
  const navigation = useNavigation<RootNavProp>();

  const renderItem = ({item}: {item: (typeof options)[number]}) => {
    return (
      <VideoMenuTextItem
        item={item.title}
        iconType={item.iconType}
        iconName={item.iconName}
        // @ts-ignore Ignore screen name error
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
          <Text
            style={{
              color: "white",
              fontSize: 25,
              fontWeight: "bold",
              marginBottom: 10,
            }}>
            {"Player Settings"}
          </Text>
        }
      />
    </VideoMenuContainer>
  );
}
