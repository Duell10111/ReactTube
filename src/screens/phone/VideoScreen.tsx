import {NativeStackScreenProps} from "@react-navigation/native-stack";
import {RootStackParamList} from "../../navigation/RootStackNavigator";
import {ActivityIndicator, StyleSheet, Text, View} from "react-native";
import VideoComponent from "../../components/VideoComponent";
import useVideoDetails from "../../hooks/useVideoDetails";
import React, {useMemo, useState} from "react";
import ErrorComponent from "../../components/general/ErrorComponent";
import VerticalVideoList from "../../components/VerticalVideoList";
import {parseObservedArray} from "../../extraction/ArrayExtraction";
import ChannelIcon from "../../components/video/ChannelIcon";
import {useAppStyle} from "../../context/AppStyleContext";

type Props = NativeStackScreenProps<RootStackParamList, "VideoScreen">;

export default function VideoScreen({route, navigation}: Props) {
  const {videoId} = route.params;
  const {YTVideoInfo, httpVideoURL, hlsManifestUrl} = useVideoDetails(videoId);

  const {style} = useAppStyle();

  const [showEndCard, setShowEndCard] = useState(false);
  // TODO: Workaround maybe replace with two components
  const [ended, setEnded] = useState(false);

  const videoUrl = useMemo(
    () => hlsManifestUrl ?? httpVideoURL,
    [hlsManifestUrl, httpVideoURL],
  );

  if (!YTVideoInfo) {
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

  if (!videoUrl) {
    return (
      <ErrorComponent
        text={
          YTVideoInfo.originalData.playability_status.reason ??
          "Video source is not available"
        }
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.videoContainer}>
        <VideoComponent
          url={videoUrl}
          style={styles.videoComponent}
          fullscreen={false}
        />
      </View>
      <View style={styles.nextVideosContainer}>
        {YTVideoInfo.originalData.watch_next_feed ? (
          <VerticalVideoList
            nodes={parseObservedArray(YTVideoInfo.originalData.watch_next_feed)}
            ListHeaderComponent={
              <View style={styles.videoMetadataContainer}>
                <Text style={[styles.titleStyle, {color: style.textColor}]}>
                  {YTVideoInfo.title}
                </Text>
                <Text style={[styles.subtitleStyle, {color: style.textColor}]}>
                  {YTVideoInfo.short_views}
                </Text>
                <View style={styles.channelContainer}>
                  <ChannelIcon
                    channelId={YTVideoInfo.channel_id!}
                    imageStyle={styles.channelStyle}
                  />
                  <Text style={styles.channelTextStyle}>
                    {YTVideoInfo.author?.name ?? ""}
                  </Text>
                </View>
              </View>
            }
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // backgroundColor: "blue",
  },
  contentContainer: {
    height: "100%",
  },
  videoContainer: {
    // backgroundColor: "red",
    height: "30%",
  },
  videoComponent: {
    flex: 1,
    marginTop: 90, // TODO: Check for Android?
  },
  videoMetadataContainer: {
    paddingHorizontal: 10,
    paddingTop: 10,
    backgroundColor: "#111111",
  },
  titleStyle: {
    fontSize: 15,
  },
  subtitleStyle: {
    fontSize: 13,
    marginTop: 5,
  },
  channelContainer: {
    flexDirection: "row",
    marginTop: 5,
  },
  channelStyle: {
    width: 40,
    height: 40,
  },
  channelTextStyle: {},
  nextVideosContainer: {
    // backgroundColor: "pink",
  },
});
