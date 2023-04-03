import React from "react";
import VideoComponent from "../components/VideoComonent";
import {NativeStackScreenProps} from "@react-navigation/native-stack";
import {RootStackParamList} from "../navigation/RootStackNavigator";
import {ActivityIndicator, StyleSheet, Text, View} from "react-native";
import useVideoDetails from "../hooks/useVideoDetails";

type Props = NativeStackScreenProps<RootStackParamList, "VideoScreen">;

export default function VideoScreen({route}: Props) {
  const {videoId} = route.params;
  const video = useVideoDetails(videoId);

  if (!video) {
    return <ActivityIndicator />;
  }

  const selectedVideo = video.metadata.playbackEndpoints?.find(
    v => v?.url !== undefined,
  );
  console.log("Video: ", selectedVideo);

  console.log("Video URL: ", selectedVideo?.url);

  return (
    <View style={[StyleSheet.absoluteFill, {backgroundColor: "red"}]}>
      <VideoComponent url={selectedVideo.url} />
      <Text />
    </View>
  );
}
