import {useFocusEffect} from "@react-navigation/native";
import {NativeStackScreenProps} from "@react-navigation/native-stack";
import React, {useEffect, useMemo, useRef, useState} from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View,
  useTVEventHandler,
  TVEventControl,
} from "react-native";

import VideoComponent from "../components/VideoComponent";
import ErrorComponent from "../components/general/ErrorComponent";
import EndCard from "../components/video/EndCard";
import VideoEndCard from "../components/video/VideoEndCard";
import VideoPlayerNative from "../components/video/VideoPlayerNative";
import VideoPlayer, {
  VideoPlayerRefs,
} from "../components/video/videoPlayer/VideoPlayer";
import useVideoDetails from "../hooks/useVideoDetails";
import LOGGER from "../utils/Logger";

import {BottomMetadata} from "@/components/video/tv/BottomMetadata";
import {useAppData} from "@/context/AppDataContext";
import useChannelDetails from "@/hooks/useChannelDetails";
import {RootStackParamList} from "@/navigation/RootStackNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "VideoScreen">;

interface PlaybackInformation {
  resolution: string;
}

// TODO: Fix if freeze if video does only provide audio!!
// TODO: Add TV remote input for suggestions https://github.com/react-native-tvos/react-native-tvos/blob/tvos-v0.64.2/README.md

// TODO: Add a button to video player to jump to beginning

export default function VideoScreen({route, navigation}: Props) {
  const {videoId, navEndpoint} = route.params;
  const {
    YTVideoInfo,
    httpVideoURL,
    hlsManifestUrl,
    startTime,
    watchNextFeed,
    fetchNextVideoContinue,
    like,
    dislike,
    removeRating,
    addToWatchHistory,
    refresh,
  } = useVideoDetails(navEndpoint ?? videoId, "TV", route.params.startSeconds);
  // @ts-ignore TODO: fix
  const {parsedChannel} = useChannelDetails(YTVideoInfo?.channel_id);
  const [playbackInfos, setPlaybackInfos] = useState<PlaybackInformation>();
  const [showEndCard, setShowEndCard] = useState(false);
  // TODO: Workaround maybe replace with two components
  const [ended, setEnded] = useState(false);

  const {appSettings} = useAppData();
  const videoPlayerRef = useRef<VideoPlayerRefs>();
  const currentTimeRef = useRef<number>();

  useEffect(() => {
    return navigation.addListener("blur", () => {
      setShowEndCard(false);
      videoPlayerRef.current?.pause();
    });
  }, [navigation]);

  // TODO: Add Endcard as additional Modal on top of VideoPlayer?

  const longClickCount = useRef(0);
  useTVEventHandler(event => {
    // LOGGER.debug("TV Event: ", event.eventType);
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
    <View style={[StyleSheet.absoluteFill]}>
      {appSettings.ownOverlayEnabled || appSettings.vlcEnabled ? (
        // TODO: Add VLC VideoComponent, once VLC Player is not broken anymore on XCode 16
        <VideoPlayer
          // @ts-ignore Ignore mutable ref issue
          ref={videoPlayerRef}
          // @ts-ignore
          VideoComponent={VideoPlayerNative}
          VideoComponentProps={{
            url: videoUrl,
            startPosition: startTime ? startTime * 1000 : undefined,
            videoInfo: YTVideoInfo.originalData,
            onPlaybackInfoUpdate: infos => {
              setPlaybackInfos({resolution: infos.height.toString() + "p"});
            },
          }}
          metadata={{
            title: YTVideoInfo.title,
            author: YTVideoInfo.author?.name ?? "Unknown",
            authorID: YTVideoInfo.channel_id ?? "",
            // @ts-ignore TODO: Allow videos without author Thumbnail?!
            authorThumbnailUrl:
              YTVideoInfo.channel?.url ?? parsedChannel?.thumbnail?.url,
            onAuthorPress: () =>
              YTVideoInfo.channel_id &&
              navigation.navigate("ChannelScreen", {
                channelId: YTVideoInfo.channel_id,
              }),
            views: YTVideoInfo.short_views ?? "Unknown views",
            videoDate: YTVideoInfo.publishDate ?? "Unknown",
            liked: YTVideoInfo.liked,
            disliked: YTVideoInfo.disliked,
            onLike: () => {
              (YTVideoInfo.liked ? removeRating : like)().catch(LOGGER.warn);
            },
            onDislike: () => {
              (YTVideoInfo?.disliked ? removeRating : dislike)().catch(
                LOGGER.warn,
              );
            },
            onSaveVideo: () => {
              YTVideoInfo?.id &&
                navigation.navigate("PlaylistManagerContextMenu", {
                  videoId: YTVideoInfo.id,
                });
            },
            onRefresh: async () => {
              refresh(
                await videoPlayerRef.current?.getCurrentPositionSeconds?.(),
              );
            },
          }}
          videoID={YTVideoInfo.id}
          onProgress={data => {
            if (
              appSettings.trackingEnabled &&
              (!currentTimeRef.current ||
                Math.abs(currentTimeRef.current - data.currentTime) > 30)
            ) {
              LOGGER.debug("Triggering watchlist update");
              addToWatchHistory(
                !currentTimeRef.current
                  ? undefined
                  : Math.floor(data.currentTime),
              ).catch(LOGGER.warn);
              currentTimeRef.current = data.currentTime;
            }
          }}
          onEnd={() => {
            setEnded(true);
            setShowEndCard(true);
            if (appSettings.trackingEnabled && YTVideoInfo?.durationSeconds) {
              addToWatchHistory(YTVideoInfo?.durationSeconds).catch(
                LOGGER.warn,
              );
            }
          }}
          bottomContainer={
            <BottomMetadata
              YTVideoInfo={YTVideoInfo}
              watchNextFeed={watchNextFeed}
              fetchMoreNextFeed={fetchNextVideoContinue}
              seek={seconds => videoPlayerRef.current?.seek(seconds)}
            />
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
          hlsUrl={YTVideoInfo.hls_manifest_url}
          videoInfo={YTVideoInfo}
          onProgress={data => {
            if (appSettings.trackingEnabled &&
              (!currentTimeRef.current ||
                Math.abs(currentTimeRef.current - data.currentTime) > 30)
            ) {
              addToWatchHistory(
                !currentTimeRef.current
                  ? undefined
                  : Math.floor(data.currentTime),
              ).catch(LOGGER.warn);
              currentTimeRef.current = data.currentTime;
            }
          }}
          onEndReached={() => {
            setEnded(true);
            setShowEndCard(true);
            if (appSettings.trackingEnabled && YTVideoInfo?.durationSeconds) {
              addToWatchHistory(YTVideoInfo?.durationSeconds).catch(LOGGER.warn);
            }
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
