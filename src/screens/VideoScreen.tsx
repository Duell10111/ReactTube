import {useFocusEffect} from "@react-navigation/native";
import {NativeStackScreenProps} from "@react-navigation/native-stack";
import React, {useEffect, useMemo, useRef, useState} from "react";
import {
  StyleSheet,
  View,
  useTVEventHandler,
  TVEventControl,
} from "react-native";

import VideoComponent from "../components/VideoComponent";
import EndCard from "../components/video/EndCard";
import VideoEndCard from "../components/video/VideoEndCard";
import VideoPlayerNative from "../components/video/VideoPlayerNative";
import VideoPlayer, {
  VideoPlayerRefs,
} from "../components/video/videoPlayer/VideoPlayer";
import useVideoDetails from "../hooks/useVideoDetails";
import LOGGER from "../utils/Logger";

import {BottomMetadata} from "@/components/video/tv/BottomMetadata";
import {
  VideoSidePanel,
  type VideoSidePanelTab,
} from "@/components/video/tv/VideoSidePanel";
import {useAppData} from "@/context/AppDataContext";
import useVideoComments from "@/hooks/comments/useVideoComments";
import useChannelDetails from "@/hooks/useChannelDetails";
import {useTranslation} from "@/localization";
import {RootStackParamList} from "@/navigation/RootStackNavigator";
import {ErrorState} from "@/ui/components";
import {VideoDetailSkeleton, createVideoDetailViewModel} from "@/ui/patterns";

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
    videoUrl,
    error,
    playbackSource,
    playbackLadderStep,
    playbackLadderSize,
    reportPlaybackFailure,
    reportProgress,
    startTime,
    watchNextFeed,
    fetchNextVideoContinue,
    like,
    dislike,
    removeRating,
    addToWatchHistory,
    refresh,
  } = useVideoDetails(navEndpoint ?? videoId, "TV", route.params.startSeconds);
  const {parsedChannel} = useChannelDetails(YTVideoInfo?.channel_id ?? "");
  const [playbackInfos, setPlaybackInfos] = useState<PlaybackInformation>();
  const [showEndCard, setShowEndCard] = useState(false);
  // TODO: Workaround maybe replace with two components
  const [ended, setEnded] = useState(false);

  const {appSettings} = useAppData();
  const {t} = useTranslation();
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<VideoSidePanelTab>("details");
  const comments = useVideoComments(
    YTVideoInfo?.id ?? videoId,
    panelOpen && panelTab === "comments",
  );
  const detailModel = useMemo(
    () =>
      YTVideoInfo
        ? createVideoDetailViewModel(YTVideoInfo, {
            translate: t,
            canOpenComments: true,
          })
        : undefined,
    [YTVideoInfo, t],
  );
  const videoPlayerRef = useRef<VideoPlayerRefs>(undefined);
  const currentTimeRef = useRef<number>(undefined);

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

  if (!YTVideoInfo) {
    if (error) {
      return (
        <ErrorState
          message={t("video.unavailable.message")}
          onRetry={() => refresh()}
          title={t("video.unavailable.title")}
        />
      );
    }

    return <VideoDetailSkeleton />;
  }

  if (!videoUrl) {
    return (
      <ErrorState
        message={
          YTVideoInfo.originalData.playability_status?.reason ??
          t("video.unavailable.message")
        }
        onRetry={() => refresh()}
        title={t("video.unavailable.title")}
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
            onPlaybackFailure: reportPlaybackFailure,
            onPlaybackInfoUpdate: infos => {
              setPlaybackInfos({
                // Plan-Phase 4.3: was gerade wirklich läuft — Quelle, Stufe und
                // Auflösung, damit ein Fehlverhalten ohne Xcode erkennbar ist.
                resolution:
                  `${infos.height}p` +
                  (playbackSource
                    ? ` · ${playbackSource.label}` +
                      (playbackLadderSize > 1
                        ? ` (${playbackLadderStep}/${playbackLadderSize})`
                        : "")
                    : ""),
              });
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
            onShowDetails: () => setPanelOpen(true),
          }}
          videoID={YTVideoInfo.id}
          onProgress={data => {
            reportProgress(data.currentTime);
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
          startPositionSeconds={startTime}
          onPlaybackFailure={reportPlaybackFailure}
          videoInfo={YTVideoInfo}
          onProgress={data => {
            reportProgress(data.currentTime);
            if (
              appSettings.trackingEnabled &&
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
              addToWatchHistory(YTVideoInfo?.durationSeconds).catch(
                LOGGER.warn,
              );
            }
          }}
          onPlaybackInfoUpdate={infos => {
            setPlaybackInfos({resolution: infos.height.toString() + "p"});
          }}
        />
      )}
      {detailModel ? (
        <VideoSidePanel
          comments={comments}
          model={detailModel}
          onClose={() => setPanelOpen(false)}
          onTabChange={setPanelTab}
          queueEntries={YTVideoInfo.playlist?.content ?? []}
          tab={panelTab}
          visible={panelOpen}
        />
      ) : null}
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
