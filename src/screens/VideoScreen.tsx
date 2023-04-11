import React from "react";
import VideoComponent from "../components/VideoComponent";
import {NativeStackScreenProps} from "@react-navigation/native-stack";
import {RootStackParamList} from "../navigation/RootStackNavigator";
import {ActivityIndicator, StyleSheet, Text, View} from "react-native";
import useVideoDetails from "../hooks/useVideoDetails";

type Props = NativeStackScreenProps<RootStackParamList, "VideoScreen">;

export default function VideoScreen({route}: Props) {
  const {videoId} = route.params;
  const {Video, selectedVideo} = useVideoDetails(videoId);

  if (!Video) {
    return <ActivityIndicator />;
  }

  // console.log("Video: ", selectedVideo);
  //
  // console.log("Video URL: ", selectedVideo?.url);

  return (
    <View style={[StyleSheet.absoluteFill, {backgroundColor: "red"}]}>
      <VideoComponent url={selectedVideo ?? ""} />
      <Text />
    </View>
  );
}
