import {NativeStackScreenProps} from "@react-navigation/native-stack";
import {RootStackParamList} from "../../navigation/RootStackNavigator";
import {ActivityIndicator, StyleSheet, Text, View} from "react-native";
import VideoComponent from "../../components/VideoComponent";
import useVideoDetails from "../../hooks/useVideoDetails";
import React, {useEffect, useMemo, useRef, useState} from "react";
import ErrorComponent from "../../components/general/ErrorComponent";
import VerticalVideoList from "../../components/VerticalVideoList";
import {parseObservedArray} from "../../extraction/ArrayExtraction";
import ChannelIcon from "../../components/video/ChannelIcon";
import {useAppStyle} from "../../context/AppStyleContext";
import Orientation, {
  ALL_ORIENTATIONS_BUT_UPSIDE_DOWN,
  OrientationLocker,
  useOrientationChange,
} from "react-native-orientation-locker";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {useIsFocused} from "@react-navigation/native";
import DeviceInfo from "react-native-device-info";
import GridView from "../../components/GridView";
import useGridColumnsPreferred from "../../hooks/home/useGridColumnsPreferred";
import PlaylistBottomSheet from "../../components/video/playlistBottomSheet/PlaylistBottomSheet";
import PlaylistBottomSheetContainer from "../../components/video/playlistBottomSheet/PlaylistBottomSheetContainer";
import BottomSheet from "@gorhom/bottom-sheet";

type Props = NativeStackScreenProps<RootStackParamList, "VideoScreen">;

export default function VideoScreen({route, navigation}: Props) {
  const {videoId, navEndpoint} = route.params;
  const {YTVideoInfo, httpVideoURL, hlsManifestUrl} = useVideoDetails(
    navEndpoint ?? videoId,
  );

  const {style} = useAppStyle();
  const inserts = useSafeAreaInsets();

  const [showEndCard, setShowEndCard] = useState(false);
  // TODO: Workaround maybe replace with two components
  const [ended, setEnded] = useState(false);

  const videoUrl = useMemo(
    () => hlsManifestUrl ?? httpVideoURL,
    [hlsManifestUrl, httpVideoURL],
  );

  const columns = useGridColumnsPreferred();

  const [fullscreen, setFullScreen] = useState(false);
  const [landscape, setLandscape] = useState(false);
  const focus = useIsFocused();

  useEffect(() => {
    Orientation.getOrientation(orientation => {
      setLandscape(
        orientation === "LANDSCAPE-LEFT" || orientation === "LANDSCAPE-RIGHT",
      );
    });
  }, []);

  useOrientationChange(orientation => {
    // Do not react if not focused
    if (!focus) {
      return;
    }
    setFullScreen(
      orientation === "LANDSCAPE-LEFT" || orientation === "LANDSCAPE-RIGHT",
    );
    setLandscape(
      orientation === "LANDSCAPE-LEFT" || orientation === "LANDSCAPE-RIGHT",
    );
  });

  const sheetRef = useRef<BottomSheet>(null);

  console.log("Landscape: ", landscape);

  const phoneLandscape = useMemo(
    () => !DeviceInfo.isTablet() && landscape,
    [landscape],
  );

  console.log("Phone Landscape: ", phoneLandscape);

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

  const listHeader = () => (
    <View style={styles.videoMetadataContainer}>
      <Text style={[styles.titleStyle, {color: style.textColor}]}>
        {YTVideoInfo.title}
      </Text>
      <View style={styles.subtitleContainer}>
        <Text style={[styles.subtitleStyle, {color: style.textColor}]}>
          {YTVideoInfo.short_views}
        </Text>
        <Text
          style={[
            styles.subtitleStyle,
            styles.subtitleDate,
            {color: style.textColor},
          ]}>
          {YTVideoInfo.publishDate}
        </Text>
      </View>
      <View style={styles.channelContainer}>
        <ChannelIcon
          channelId={YTVideoInfo.channel_id!}
          imageStyle={styles.channelStyle}
        />
        <Text style={[styles.channelTextStyle, {color: style.textColor}]}>
          {YTVideoInfo.channel?.name ?? YTVideoInfo.author?.name}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <OrientationLocker orientation={ALL_ORIENTATIONS_BUT_UPSIDE_DOWN} />
      <View
        style={[
          phoneLandscape ? StyleSheet.absoluteFill : styles.videoContainer,
        ]}>
        <VideoComponent
          url={videoUrl}
          style={[
            phoneLandscape
              ? styles.videoComponentFullscreen
              : styles.videoComponent,
          ]}
          fullscreen={fullscreen}
        />
      </View>
      {!phoneLandscape ? (
        <View style={styles.nextVideosContainer}>
          {YTVideoInfo.originalData.watch_next_feed ? (
            DeviceInfo.isTablet() ? (
              <GridView
                shelfItem={YTVideoInfo.originalData.watch_next_feed}
                ListHeaderComponent={listHeader}
                contentContainerStyle={{paddingBottom: inserts.bottom}}
                columns={columns}
              />
            ) : (
              <VerticalVideoList
                nodes={parseObservedArray(
                  YTVideoInfo.originalData.watch_next_feed,
                )}
                ListHeaderComponent={listHeader}
                contentContainerStyle={{paddingBottom: inserts.bottom}}
              />
            )
          ) : null}
          {YTVideoInfo.playlist ? (
            <PlaylistBottomSheetContainer
              ytInfoPlaylist={YTVideoInfo.playlist}
              onPress={() => sheetRef.current?.snapToIndex(0)}
            />
          ) : null}
          {YTVideoInfo.playlist ? (
            <PlaylistBottomSheet
              ytInfoPlaylist={YTVideoInfo?.playlist}
              ref={sheetRef}
            />
          ) : null}
        </View>
      ) : null}
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
  videoComponentFullscreen: {
    height: "100%",
    width: "100%",
    marginTop: 30, // TODO: Check for Android?
  },
  videoMetadataContainer: {
    paddingHorizontal: 10,
    paddingTop: 10,
    backgroundColor: "#111111",
  },
  titleStyle: {
    fontSize: 15,
  },
  subtitleContainer: {
    flexDirection: "row",
  },
  subtitleStyle: {
    fontSize: 13,
    marginTop: 5,
  },
  subtitleDate: {
    marginStart: 5,
  },
  channelContainer: {
    flexDirection: "row",
    marginTop: 5,
    alignItems: "center",
  },
  channelStyle: {
    width: 40,
    height: 40,
  },
  channelTextStyle: {
    marginStart: 5,
  },
  nextVideosContainer: {
    flex: 1,
    // backgroundColor: "pink",
  },
});
