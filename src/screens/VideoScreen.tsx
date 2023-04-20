import React, {useEffect, useState} from "react";
import VideoComponent from "../components/VideoComponent";
import {NativeStackScreenProps} from "@react-navigation/native-stack";
import {RootStackParamList} from "../navigation/RootStackNavigator";
import {ActivityIndicator, StyleSheet, Text, View} from "react-native";
import useVideoDetails from "../hooks/useVideoDetails";
import EndCard from "../components/video/EndCard";

type Props = NativeStackScreenProps<RootStackParamList, "VideoScreen">;

// TODO: Fix if freeze if video does only provide audio!!
// TODO: Add TV remote input for suggestions https://github.com/react-native-tvos/react-native-tvos/blob/tvos-v0.64.2/README.md

export default function VideoScreen({route, navigation}: Props) {
  const {videoId} = route.params;
  const {Video, selectedVideo} = useVideoDetails(videoId);
  const [showEndCard, setShowEndCard] = useState(false);

  useEffect(() => {
    return navigation.addListener("blur", () => {
      setShowEndCard(false);
    });
  }, [navigation]);

  if (!Video) {
    return (
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            alignItems: "center",
            justifyContent: "center",
          },
        ]}>
        <ActivityIndicator size={"large"} />
      </View>
    );
  }

  return (
    <View style={[StyleSheet.absoluteFill]}>
      <VideoComponent
        url={selectedVideo ?? ""}
        onEndReached={() => setShowEndCard(true)}
      />
      <EndCard
        video={Video}
        visible={showEndCard}
        onCloseRequest={() => {
          console.log("Back pressed");
          setShowEndCard(false);
        }}
      />
    </View>
  );
}
