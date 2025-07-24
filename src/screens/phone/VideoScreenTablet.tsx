import BottomSheet from "@gorhom/bottom-sheet";
import {useIsFocused} from "@react-navigation/native";
import {NativeStackScreenProps} from "@react-navigation/native-stack";
import React, {useEffect, useMemo, useRef, useState} from "react";
import {
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  FlipInEasyY,
  FlipOutEasyX,
  LinearTransition,
} from "react-native-reanimated";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {VideoRef} from "react-native-video";

import VerticalVideoList from "@/components/VerticalVideoList";
import ErrorComponent from "@/components/general/ErrorComponent";
import GridFeedViewPhone from "@/components/grid/GridFeedViewPhone";
import {VideoMetadataContainer} from "@/components/video/phone/VideoMetadataContainer";
import {VideoPlayerPhone} from "@/components/video/phone/VideoPlayerPhone";
import PlaylistBottomSheet from "@/components/video/playlistBottomSheet/PlaylistBottomSheet";
import PlaylistBottomSheetContainer from "@/components/video/playlistBottomSheet/PlaylistBottomSheetContainer";
import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {parseObservedArray} from "@/extraction/ArrayExtraction";
import useOrientationChange from "@/hooks/ui/useOrientationChange";
import useVideoDetails from "@/hooks/useVideoDetails";
import {RootStackParamList} from "@/navigation/RootStackNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "VideoScreen">;

// TODO: Tablet version hangs after orientation change :/

export default function VideoScreenTablet({route, navigation}: Props) {
  const {width, height} = useWindowDimensions();
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

  const {bottom} = useSafeAreaInsets();
  const videoRef = useRef<VideoRef>(undefined);

  const videoUrl = useMemo(
    () => hlsManifestUrl ?? httpVideoURL,
    [hlsManifestUrl, httpVideoURL],
  );

  const [landscape, setLandscape] = useState(false);
  useOrientationChange(orientation => {
    // Do not react if not focused
    if (!focus) {
      return;
    }
    setLandscape(orientation === "LANDSCAPE");
  });

  const sheetRef = useRef<BottomSheet>(null);

  // TODO: Outsource in hook with continuation?
  const parsedWatchNext = useMemo(() => {
    return YTVideoInfo?.originalData?.watch_next_feed
      ? parseObservedArray(YTVideoInfo.originalData.watch_next_feed)
      : [];
  }, [YTVideoInfo?.originalData?.watch_next_feed]);

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

  console.log("Landscape: ", landscape);
  // console.log("Playlist: ", YTVideoInfo.playlist);

  return (
    <View
      style={[styles.container, landscape ? styles.containerLandscape : null]}>
      <View
        style={[
          landscape
            ? styles.videoContainerTabletLandscape
            : styles.videoContainerTablet,
        ]}>
        <Animated.View
          style={{
            // Use fix height to probit flickering
            height: landscape ? width * (7 / 16) : height * 0.5,
          }}
          layout={LinearTransition}>
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
        </Animated.View>
        {landscape ? (
          <Animated.ScrollView entering={FlipInEasyY} exiting={FlipOutEasyX}>
            <VideoMetadataContainer
              // @ts-ignore Ignore issue for now
              actionData={actionData}
              YTVideoInfo={YTVideoInfo}
              dislike={dislike}
              like={like}
              removeRating={removeRating}
            />
          </Animated.ScrollView>
        ) : null}
      </View>
      <Animated.View style={[styles.bottomContainer]} layout={LinearTransition}>
        {false ? (
          <VerticalVideoList
            style={{marginStart: 10}}
            nodes={parsedWatchNext}
            contentInsetAdjustmentBehavior={"always"}
            contentContainerStyle={{
              paddingBottom: 60 + bottom,
            }}
            ListHeaderComponent={
              !landscape ? (
                <VideoMetadataContainer
                  // @ts-ignore TODO: fix
                  actionData={actionData}
                  // @ts-ignore TODO: fix
                  YTVideoInfo={YTVideoInfo}
                  dislike={dislike}
                  like={like}
                  removeRating={removeRating}
                />
              ) : undefined
            }
          />
        ) : (
          <GridFeedViewPhone
            items={parsedWatchNext}
            itemDimension={350}
            contentContainerStyle={{
              paddingBottom: 120 + bottom,
            }}
            ListHeaderComponent={
              !landscape ? (
                <VideoMetadataContainer
                  // @ts-ignore TODO: fix
                  actionData={actionData}
                  YTVideoInfo={YTVideoInfo}
                  dislike={dislike}
                  like={like}
                  removeRating={removeRating}
                />
              ) : undefined
            }
          />
        )}
        {landscape && YTVideoInfo.playlist ? (
          <>
            <PlaylistBottomSheetContainer
              ytInfoPlaylist={YTVideoInfo.playlist}
              onPress={() => sheetRef.current?.snapToIndex(0)}
              style={{bottom: 100}}
            />
            <PlaylistBottomSheet
              ytInfoPlaylist={YTVideoInfo?.playlist}
              ref={sheetRef}
              flatListContentContainerStyle={{paddingBottom: 125}}
            />
          </>
        ) : null}
      </Animated.View>
      {!landscape && YTVideoInfo.playlist ? (
        <>
          <PlaylistBottomSheetContainer
            ytInfoPlaylist={YTVideoInfo.playlist}
            onPress={() => sheetRef.current?.snapToIndex(0)}
            style={{bottom: 100}}
          />
          <PlaylistBottomSheet
            ytInfoPlaylist={YTVideoInfo?.playlist}
            ref={sheetRef}
            flatListContentContainerStyle={{paddingBottom: 125}}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: "100%",
    width: "100%",
    // marginTop: 95, // Workaround as video seems not on right place otherwise at start and glitches down on-screen switch :/ https://github.com/TheWidlarzGroup/react-native-video/issues/4091
  },
  containerLandscape: {
    flexDirection: "row",
  },
  // Use fix height to probit flickering
  // videoContainer: {
  //   flex: 1,
  // },
  // videoContainerLandscape: {
  //   width: "100%",
  //   aspectRatio: 16 / 9,
  // },
  videoComponent: {
    width: "100%",
    height: "100%",
  },
  bottomContainer: {
    flex: 1,
  },
  videoContainerTabletLandscape: {
    height: "100%",
    width: "65%",
    // backgroundColor: "yellow",
  },
  videoContainerTablet: {
    height: "55%",
  },
});
