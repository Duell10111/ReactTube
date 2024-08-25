import {useFocusEffect} from "@react-navigation/native";
import {NativeStackScreenProps} from "@react-navigation/native-stack";
import {Icon} from "@rneui/base";
import React, {useEffect, useMemo, useRef, useState} from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View,
  useTVEventHandler,
  TVEventControl,
  ScrollView,
  Text,
} from "react-native";

import HorizontalVideoList from "../components/HorizontalVideoList";
import VideoComponent from "../components/VideoComponent";
import ErrorComponent from "../components/general/ErrorComponent";
import EndCard from "../components/video/EndCard";
import VideoEndCard from "../components/video/VideoEndCard";
import VideoPlayerNative from "../components/video/VideoPlayerNative";
import VideoPlayerVLC from "../components/video/VideoPlayerVLC";
import VideoPlayer, {
  VideoPlayerRefs,
} from "../components/video/videoPlayer/VideoPlayer";
import {useAppData} from "../context/AppDataContext";
import {parseObservedArray} from "../extraction/ArrayExtraction";
import useChannelDetails from "../hooks/useChannelDetails";
import useVideoDetails from "../hooks/useVideoDetails";
import {RootStackParamList} from "../navigation/RootStackNavigator";
import LOGGER from "../utils/Logger";

type Props = NativeStackScreenProps<RootStackParamList, "VideoScreen">;

interface PlaybackInformation {
  resolution: string;
}

// TODO: Fix if freeze if video does only provide audio!!
// TODO: Add TV remote input for suggestions https://github.com/react-native-tvos/react-native-tvos/blob/tvos-v0.64.2/README.md

export default function VideoScreen({route, navigation}: Props) {
  const {videoId, navEndpoint} = route.params;
  console.log("VideoID: ", videoId);
  console.log("NavEndpoint: ", navEndpoint);
  const {YTVideoInfo, httpVideoURL, hlsManifestUrl} = useVideoDetails(
    navEndpoint ?? videoId,
  );
  const [playbackInfos, setPlaybackInfos] = useState<PlaybackInformation>();
  const [showEndCard, setShowEndCard] = useState(false);
  // TODO: Workaround maybe replace with two components
  const [ended, setEnded] = useState(false);

  const {appSettings} = useAppData();

  // TODO: Will be replaced once embed server is available on tvOS
  const hlsUrl = useMemo(() => {
    return appSettings.localHlsEnabled
      ? `http://192.168.178.10:7500/video/${videoId}/master.m3u8`
      : undefined;
  }, [appSettings.localHlsEnabled, videoId]);

  useEffect(() => {
    return navigation.addListener("blur", () => {
      setShowEndCard(false);
    });
  }, [navigation]);

  // TODO: Add Endcard as additional Modal on top of VideoPlayer?

  const longClickCount = useRef(0);
  useTVEventHandler(event => {
    LOGGER.debug("TV Event: ", event.eventType);
    // Skip on own overlay enabled!
    if (appSettings.ownOverlayEnabled) {
      return;
    }
    if (event.eventType === "longDown" || event.eventType === "longSelect") {
      longClickCount.current = longClickCount.current + 1;
      // Workaround as Modal Close Events are not correctly reported by RN TVOS
      if (longClickCount.current % 2 === 0) {
        longClickCount.current = 0;
        if (showEndCard) {
          setShowEndCard(false);
        } else {
          setEnded(false);
          setShowEndCard(true);
        }
      }
    }
  });

  useFocusEffect(() => {
    // Enable TV Menu Key to fix issue if video not loading
    TVEventControl.enableTVMenuKey();
  });

  const videoUrl = useMemo(
    () => hlsManifestUrl ?? httpVideoURL,
    [hlsManifestUrl, httpVideoURL],
  );

  const watchNextList = useMemo(
    () =>
      YTVideoInfo?.originalData?.watch_next_feed
        ? parseObservedArray(YTVideoInfo.originalData.watch_next_feed)
        : [],
    [YTVideoInfo?.originalData?.watch_next_feed],
  );

  const videoPlayerRef = useRef<VideoPlayerRefs>();

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
    <View style={[StyleSheet.absoluteFill]}>
      {appSettings.vlcEnabled ? (
        <VideoPlayerVLC
          videoInfo={YTVideoInfo.originalData}
          url={videoUrl}
          hlsUrl={hlsUrl}
          onEndReached={() => {
            setEnded(true);
            setShowEndCard(true);
          }}
          disableControls={showEndCard}
        />
      ) : appSettings.ownOverlayEnabled ? (
        <VideoPlayer
          ref={videoPlayerRef}
          // @ts-ignore
          VideoComponent={VideoPlayerNative}
          VideoComponentProps={{
            url: videoUrl,
            hlsUrl,
            videoInfo: YTVideoInfo.originalData,
            onPlaybackInfoUpdate: infos => {
              setPlaybackInfos({resolution: infos.height.toString() + "p"});
            },
          }}
          metadata={{
            title: YTVideoInfo.title,
            author: YTVideoInfo.author?.name,
            authorUrl: YTVideoInfo.author?.id,
            views: YTVideoInfo.short_views,
            videoDate: YTVideoInfo.publishDate,
          }}
          videoID={YTVideoInfo.id}
          onEnd={() => {
            setEnded(true);
            setShowEndCard(true);
          }}
          bottomContainer={
            <View>
              {YTVideoInfo.playlist ? (
                <>
                  <View style={styles.bottomPlaylistTextContainer}>
                    <Icon name={"book"} color={"white"} />
                    <Text style={styles.bottomPlaylistText}>
                      {YTVideoInfo.playlist.title}
                    </Text>
                  </View>
                  <HorizontalVideoList
                    nodes={YTVideoInfo.playlist.content}
                    textStyle={styles.text}
                  />
                </>
              ) : null}
              <Text style={styles.bottomText}>{"Related Videos"}</Text>
              <HorizontalVideoList
                nodes={watchNextList}
                textStyle={styles.text}
              />
            </View>
          }
          endCardContainer={
            YTVideoInfo.endscreen ? (
              <VideoEndCard endcard={YTVideoInfo.endscreen} />
            ) : null
          }
          endCardStartSeconds={YTVideoInfo.endscreen?.startDuration}
        />
      ) : (
        <VideoComponent
          url={videoUrl}
          hlsUrl={hlsUrl}
          videoInfo={YTVideoInfo}
          onEndReached={() => {
            setEnded(true);
            setShowEndCard(true);
          }}
          onPlaybackInfoUpdate={infos => {
            setPlaybackInfos({resolution: infos.height.toString() + "p"});
          }}
        />
      )}
      <EndCard
        video={YTVideoInfo}
        visible={showEndCard}
        onCloseRequest={() => {
          console.log("Back pressed");
          setShowEndCard(false);
        }}
        endCard={ended}
        currentResolution={playbackInfos?.resolution}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  touchContainer: {
    backgroundColor: "#11111199",
    flex: 1,
    justifyContent: "flex-end",
  },
  videoInfoContainer: {
    backgroundColor: "#111111cc",
    paddingStart: 20,
    flexDirection: "row",
  },
  channelContainer: {
    alignItems: "center",
  },
  channelText: {
    fontSize: 17,
  },
  videoContainer: {
    marginStart: 10,
    justifyContent: "center",
  },
  videoTitle: {
    fontSize: 25,
  },
  viewsText: {
    alignSelf: "flex-start",
  },
  text: {
    color: "white",
  },
  nextVideoContainer: {
    flex: 1,
  },
  bottomContainer: {
    width: "100%",
    minHeight: "40%",
    maxHeight: "50%",
    backgroundColor: "#111111cc",
    justifyContent: "center",
    paddingTop: 20,
  },
  bottomText: {
    fontSize: 20,
    paddingStart: 20,
    color: "white",
    paddingBottom: 15,
  },
  bottomPlaylistTextContainer: {
    flexDirection: "row",
    paddingStart: 20,
    paddingBottom: 15,
  },
  bottomPlaylistText: {
    fontSize: 20,
    color: "white",
    paddingStart: 10,
  },
});
