// TODO: Add Reel Video Screen

import {
  ActivityIndicator,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {NativeStackScreenProps} from "@react-navigation/native-stack";
import {RootStackParamList} from "../../navigation/RootStackNavigator";
import Carousel from "react-native-reanimated-carousel";
import useVideoDetails from "../../hooks/useVideoDetails";
import React, {createContext, useContext, useMemo, useState} from "react";
import {YTNodes} from "youtubei.js";
import VideoComponent from "../../components/VideoComponent";
import ErrorComponent from "../../components/general/ErrorComponent";
import {parseObservedArray} from "../../extraction/ArrayExtraction";

type Props = NativeStackScreenProps<RootStackParamList, "VideoScreen">;

export default function ReelVideoScreen({route}: Props) {
  const {videoId, navEndpoint} = route.params;
  const {YTVideoInfo} = useVideoDetails(navEndpoint ?? videoId);

  const {width, height} = useWindowDimensions();

  const playlistData = useMemo(() => {
    if (YTVideoInfo) {
      // TODO: Does not contain the reel feed :/
      const watchNext = YTVideoInfo.originalData.watch_next_feed
        ? parseObservedArray(YTVideoInfo.originalData.watch_next_feed)
            // .filter(i => i.type === "reel")
            .map(data => data.id)
        : [];
      return [YTVideoInfo.id, ...watchNext];
    }
    return undefined;
  }, [YTVideoInfo]);

  const [context, setContext] = useState<number>(0);

  if (!playlistData) {
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
    <reelContext.Provider value={{selected: context}}>
      <Carousel
        loop={false}
        vertical
        width={width}
        height={height}
        data={playlistData}
        scrollAnimationDuration={1000}
        onSnapToItem={index => {
          setContext(index);
          console.log("current index:", index);
        }}
        renderItem={({index, item}) => (
          <VideoItem videoId={item} index={index} />
        )}
      />
    </reelContext.Provider>
  );
}

interface ItemProps {
  videoId: string | YTNodes.NavigationEndpoint;
  index: number;
}

function VideoItem({videoId, index}: ItemProps) {
  const {
    YTVideoInfo,
    httpVideoURL,
    hlsManifestUrl,
    actionData,
    like,
    dislike,
    removeRating,
  } = useVideoDetails(videoId);

  const videoUrl = useMemo(
    () => hlsManifestUrl ?? httpVideoURL,
    [hlsManifestUrl, httpVideoURL],
  );

  const {selected} = useContext(reelContext);

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

  // TODO: Add Gesture handler for pause handling
  return (
    <View style={styles.videoContainer}>
      <VideoComponent
        url={videoUrl}
        style={[styles.videoComponentFullscreen]}
        fullscreen={false}
        paused={selected !== index}
        controls={false}
        repeat={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  videoContainer: {
    flex: 1,
    borderWidth: 1,
    backgroundColor: "red",
  },
  videoComponentFullscreen: {
    height: "100%",
    width: "100%",
    // marginTop: 30, // TODO: Check for Android?
  },
});

interface ReelContext {
  selected?: number;
}

const reelContext = createContext<ReelContext>({});
