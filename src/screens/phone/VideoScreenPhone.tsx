import BottomSheet from "@gorhom/bottom-sheet";
import {useIsFocused} from "@react-navigation/native";
import {NativeStackScreenProps} from "@react-navigation/native-stack";
import React, {useEffect, useMemo, useRef} from "react";
import {ActivityIndicator, StyleSheet, View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {VideoRef} from "react-native-video";

import VerticalVideoList from "@/components/VerticalVideoList";
import ErrorComponent from "@/components/general/ErrorComponent";
import VideoEndCard from "@/components/video/VideoEndCard";
import {VideoMetadataContainer} from "@/components/video/phone/VideoMetadataContainer";
import {VideoPlayerPhone} from "@/components/video/phone/VideoPlayerPhone";
import PlaylistBottomSheet from "@/components/video/playlistBottomSheet/PlaylistBottomSheet";
import PlaylistBottomSheetContainer from "@/components/video/playlistBottomSheet/PlaylistBottomSheetContainer";
import {useAppStyle} from "@/context/AppStyleContext";
import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {parseObservedArray} from "@/extraction/ArrayExtraction";
import useOrientationChangeMotionSensor from "@/hooks/ui/useOrientationChangeMotionSensor";
import useVideoDetails from "@/hooks/useVideoDetails";
import {RootStackParamList} from "@/navigation/RootStackNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "VideoScreen">;

export default function VideoScreenPhone({route, navigation}: Props) {
  const {videoId, navEndpoint} = route.params;
  const {
    YTVideoInfo,
    httpVideoURL,
    hlsManifestUrl,
    actionData,
    like,
    dislike,
    removeRating,
  } = useVideoDetails(navEndpoint ?? videoId);
  const focus = useIsFocused();

  // Pause Music if playing. :)
  const {playing, pause} = useMusikPlayerContext();
  useEffect(() => {
    if (playing) {
      pause();
    }
  }, []);

  const {style} = useAppStyle();
  const {bottom} = useSafeAreaInsets();
  const videoRef = useRef<VideoRef>(undefined);

  const videoUrl = useMemo(
    () => hlsManifestUrl ?? httpVideoURL,
    [hlsManifestUrl, httpVideoURL],
  );

  // TODO: Currently causing more issues than it helps :/
  // const {orientation} = useOrientationChangeMotionSensor();
  //
  // useEffect(() => {
  //   if (focus) {
  //     console.log(
  //       "Updating Fullscreen: ",
  //       orientation === 90 || orientation === -90,
  //     );
  //     videoRef.current?.setFullScreen(
  //       orientation === 90 || orientation === -90,
  //     );
  //   }
  // }, [orientation]);

  const sheetRef = useRef<BottomSheet>(null);

  console.log("Playlist: ", YTVideoInfo?.playlist);

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
          YTVideoInfo.originalData.playability_status?.reason ??
          "Video source is not available"
        }
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.videoContainer}>
        <VideoPlayerPhone
          sourceURL={videoUrl}
          style={styles.videoComponent}
          // @ts-ignore
          ref={videoRef}
          onPipPress={() => {
            videoRef.current?.pause();
          }}>
          {/*{YTVideoInfo.endscreen ? (*/}
          {/*  <VideoEndCard endcard={YTVideoInfo.endscreen} />*/}
          {/*) : null}*/}
        </VideoPlayerPhone>
      </View>
      <View style={[styles.bottomContainer]}>
        <VerticalVideoList
          nodes={
            YTVideoInfo.originalData.watch_next_feed
              ? parseObservedArray(YTVideoInfo.originalData.watch_next_feed)
              : []
          }
          contentInsetAdjustmentBehavior={"always"}
          contentContainerStyle={{paddingBottom: 60 + bottom}}
          ListHeaderComponent={
            <VideoMetadataContainer
              // @ts-ignore Ignore for now
              actionData={actionData}
              YTVideoInfo={YTVideoInfo}
              dislike={dislike}
              like={like}
              removeRating={removeRating}
            />
          }
        />
      </View>
      {YTVideoInfo.playlist ? (
        <PlaylistBottomSheetContainer
          ytInfoPlaylist={YTVideoInfo.playlist}
          onPress={() => sheetRef.current?.snapToIndex(0)}
          style={{bottom: 125}}
        />
      ) : null}
      {YTVideoInfo.playlist ? (
        <PlaylistBottomSheet
          ytInfoPlaylist={YTVideoInfo?.playlist}
          ref={sheetRef}
          flatListContentContainerStyle={{paddingBottom: 125}}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: "100%",
    width: "100%",
    // marginTop: Platform.OS === "ios" ? 95 : 0, // Workaround as video seems not on right place otherwise at start and glitches down on-screen switch :/ https://github.com/TheWidlarzGroup/react-native-video/issues/4091
  },
  videoContainer: {
    width: "100%",
    // aspectRatio: 1.7,
    height: 270,
  },
  videoComponent: {
    width: "100%",
    height: "100%",
  },
  bottomContainer: {
    flex: 1,
  },
});
