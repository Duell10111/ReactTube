import React, {useEffect, useState} from "react";
import VideoComponent from "../components/VideoComponent";
import {NativeStackScreenProps} from "@react-navigation/native-stack";
import {RootStackParamList} from "../navigation/RootStackNavigator";
import {
  ActivityIndicator,
  StyleSheet,
  View,
  useTVEventHandler,
  TVEventControl,
} from "react-native";
import useVideoDetails from "../hooks/useVideoDetails";
import EndCard from "../components/video/EndCard";
import LOGGER from "../utils/Logger";
import VideoPlayerVLC from "../components/video/VideoPlayerVLC";
import {useAppData} from "../context/AppDataContext";
import ErrorComponent from "../components/general/ErrorComponent";
import {useFocusEffect} from "@react-navigation/native";

type Props = NativeStackScreenProps<RootStackParamList, "VideoScreen">;

// TODO: Fix if freeze if video does only provide audio!!
// TODO: Add TV remote input for suggestions https://github.com/react-native-tvos/react-native-tvos/blob/tvos-v0.64.2/README.md

export default function VideoScreen({route, navigation}: Props) {
  const {videoId} = route.params;
  const {Video, selectedVideo} = useVideoDetails(videoId);
  const [showEndCard, setShowEndCard] = useState(false);
  // TODO: Workaround maybe replace with two components
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    return navigation.addListener("blur", () => {
      setShowEndCard(false);
    });
  }, [navigation]);

  useTVEventHandler(event => {
    LOGGER.debug("TV Event: ", event.eventType);
    if (event.eventType === "longDown" || event.eventType === "longSelect") {
      setEnded(false);
      setShowEndCard(true);
    }
  });

  useFocusEffect(() => {
    // Enable TV Menu Key to fix issue if video not loading
    TVEventControl.enableTVMenuKey();
  });

  const {appSettings} = useAppData();

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

  if (!selectedVideo) {
    return (
      <ErrorComponent
        text={
          Video.playability_status.reason ?? "Video source is not available"
        }
      />
    );
  }
  return (
    <View style={[StyleSheet.absoluteFill]}>
      {appSettings.vlcEnabled ? (
        <VideoPlayerVLC
          videoInfo={Video}
          url={selectedVideo ?? ""}
          onEndReached={() => {
            setEnded(true);
            setShowEndCard(true);
          }}
          disableControls={showEndCard}
        />
      ) : (
        <VideoComponent
          url={selectedVideo ?? ""}
          onEndReached={() => {
            setEnded(true);
            setShowEndCard(true);
          }}
        />
      )}
      <EndCard
        video={Video}
        visible={showEndCard}
        onCloseRequest={() => {
          console.log("Back pressed");
          setShowEndCard(false);
        }}
        endCard={ended}
      />
    </View>
  );
}
