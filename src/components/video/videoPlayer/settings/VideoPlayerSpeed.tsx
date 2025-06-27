import React from "react";
import {FlatList, Text, View} from "react-native";

import {VideoMenuContainer} from "@/components/general/VideoMenuContainer";
import {VideoMenuItem} from "@/components/video/videoPlayer/settings/VideoMenuItem";
import {useVideoPlayerSettings} from "@/components/video/videoPlayer/settings/VideoPlayerSettingsContext";

const speeds = [0.2, 1, 2];

export function VideoPlayerSpeed() {
  const {speed} = useVideoPlayerSettings();

  const renderItem = ({item}: {item: number}) => (
    <VideoMenuItem selected={speed === item}>
      <View style={{flex: 1}}>
        <Text
          style={{
            color: speed === item ? "black" : "white",
            fontSize: 30,
            fontWeight: "bold",
            alignSelf: "center",
          }}>
          {item}
        </Text>
      </View>
    </VideoMenuItem>
  );

  return (
    <VideoMenuContainer>
      <FlatList
        data={speeds}
        renderItem={renderItem}
        ListHeaderComponent={
          <Text
            style={{
              color: "white",
              fontSize: 25,
              fontWeight: "bold",
              marginBottom: 10,
            }}>
            {"Player Speeds"}
          </Text>
        }
      />
    </VideoMenuContainer>
  );
}
