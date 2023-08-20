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
import {
  ALL_ORIENTATIONS_BUT_UPSIDE_DOWN,
  OrientationLocker,
  useOrientationChange,
} from "react-native-orientation-locker";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {useIsFocused} from "@react-navigation/native";

type Props = NativeStackScreenProps<RootStackParamList, "VideoScreen">;

export default function VideoScreen({route, navigation}: Props) {
  const {videoId} = route.params;
  const {YTVideoInfo, httpVideoURL, hlsManifestUrl} = useVideoDetails(videoId);

  const {style} = useAppStyle();
  const inserts = useSafeAreaInsets();

  const [showEndCard, setShowEndCard] = useState(false);
  // TODO: Workaround maybe replace with two components
  const [ended, setEnded] = useState(false);

  const videoUrl = useMemo(
    () => hlsManifestUrl ?? httpVideoURL,
    [hlsManifestUrl, httpVideoURL],
  );

  const [fullscreen, setFullScreen] = useState(false);

  const focus = useIsFocused();

  useOrientationChange(orientation => {
    // Do not react if not focused
    if (!focus) {
      return;
    }
    setFullScreen(
      orientation === "LANDSCAPE-LEFT" || orientation === "LANDSCAPE-RIGHT",
    );
  });

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

  console.log("Fullscreen: ", fullscreen);

  return (
    <View style={styles.container}>
      <OrientationLocker orientation={ALL_ORIENTATIONS_BUT_UPSIDE_DOWN} />
      <View style={styles.videoContainer}>
        <VideoComponent
          url={videoUrl}
          style={styles.videoComponent}
          fullscreen={fullscreen}
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
            contentContainerStyle={{paddingBottom: inserts.bottom}}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: "blue",
  },
  contentContainer: {
    height: "100%",
  },
  videoContainer: {
    // backgroundColor: "red",
    height: "35%",
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
    flex: 1,
    // backgroundColor: "pink",
  },
});
