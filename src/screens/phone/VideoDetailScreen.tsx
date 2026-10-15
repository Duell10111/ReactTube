import {useIsFocused} from "@react-navigation/native";
import {NativeStackScreenProps} from "@react-navigation/native-stack";
import {NavigationBar} from "expo-navigation-bar";
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Platform, ScrollView, StatusBar, StyleSheet, View} from "react-native";
import {VideoRef} from "react-native-video";

import VideoPlayerNative from "@/components/video/VideoPlayerNative";
import VideoPlayerVLC from "@/components/video/VideoPlayerVLC";
import PhoneOverlayPlayer from "@/components/video/phone/PhoneOverlayPlayer";
import {PhoneVideoSettingsSheet} from "@/components/video/phone/PhoneVideoSettingsSheet";
import {VideoPlayerPhone} from "@/components/video/phone/VideoPlayerPhone";
import {
  isAutoplayEnabled,
  resolveUpNext,
} from "@/components/video/phone/phoneAutoplayModel";
import {useAppData} from "@/context/AppDataContext";
import {useDownloaderContext} from "@/context/DownloaderContext";
import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {usePlaylistManagerContext} from "@/context/PlaylistManagerContext";
import useChannelManager from "@/hooks/channel/useChannelManager";
import useVideoComments from "@/hooks/comments/useVideoComments";
import useOrientationChange from "@/hooks/ui/useOrientationChange";
import useVideoDetails from "@/hooks/useVideoDetails";
import usePlayerFullscreen from "@/hooks/video/usePlayerFullscreen";
import {useTranslation} from "@/localization";
import {RootStackParamList} from "@/navigation/RootStackNavigator";
import {ErrorState} from "@/ui/components";
import {useAppChrome} from "@/ui/layout";
import {
  ActionBarItem,
  CommentList,
  MediaFeed,
  SheetPanel,
  VideoDescriptionPanel,
  VideoDetailHeader,
  VideoDetailSkeleton,
  VideoQueuePanel,
  createVideoDetailViewModel,
  getVideoDetailLayout,
} from "@/ui/patterns";
import {useAppTheme} from "@/ui/theme";
import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("VIDEO_DETAIL");

type Props = NativeStackScreenProps<RootStackParamList, "VideoScreen">;

type PanelId = "description" | "comments" | "queue" | "playerSettings";

/**
 * Video detail for phone and tablet. One screen for both: the difference
 * between them is the arrangement, and that is decided by `getVideoDetailLayout`
 * from the layout class and the orientation, not by the device type.
 */
export default function VideoDetailScreen({route, navigation}: Props) {
  const {videoId, navEndpoint} = route.params;
  const {theme} = useAppTheme();
  const {t} = useTranslation();
  const {layout} = useAppChrome();
  const focused = useIsFocused();

  const {
    YTVideoInfo,
    videoUrl,
    loading,
    error,
    refresh,
    watchNextFeed,
    fetchNextVideoContinue,
    actionData,
    like,
    dislike,
    removeRating,
    playbackSource,
    startTime,
    reportPlaybackFailure,
    reportProgress,
    reportEnded,
  } = useVideoDetails(navEndpoint ?? videoId);

  const {appSettings, updateSettings} = useAppData();
  const autoplay = isAutoplayEnabled(appSettings);
  const upNext = useMemo(
    () => (YTVideoInfo ? resolveUpNext(YTVideoInfo, watchNextFeed) : undefined),
    [YTVideoInfo, watchNextFeed],
  );
  // The same player setting as on TV: the own overlay draws YouTube's
  // controls above the native player, and VLC always runs behind it.
  const overlayEnabled = Boolean(
    appSettings.ownOverlayEnabled || appSettings.vlcEnabled,
  );
  const {fullscreen: fullscreenState, toggleFullscreen} = usePlayerFullscreen({
    followRotation: overlayEnabled,
  });
  // The native controls bring their own full screen.
  const fullscreen = overlayEnabled && fullscreenState;

  const [landscape, setLandscape] = useState(false);
  useOrientationChange(orientation => {
    if (focused) {
      setLandscape(orientation === "LANDSCAPE");
    }
  });

  const detailLayout = useMemo(
    () => getVideoDetailLayout({layout, landscape}),
    [landscape, layout],
  );

  const [panel, setPanel] = useState<PanelId>();
  const [subscribed, setSubscribed] = useState(false);
  const videoRef = useRef<VideoRef>(null);

  const commentVideoId = YTVideoInfo?.id ?? videoId;
  const comments = useVideoComments(commentVideoId, panel === "comments");

  const {playing, pause} = useMusikPlayerContext();
  const {save} = usePlaylistManagerContext();
  const {download} = useDownloaderContext();
  const {subscribe, unsubscribe} = useChannelManager();

  // Two players sharing the output would talk over each other.
  useEffect(() => {
    if (playing) {
      pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSubscribed(YTVideoInfo?.subscribed ?? false);
  }, [YTVideoInfo?.subscribed]);

  const model = useMemo(
    () =>
      YTVideoInfo
        ? createVideoDetailViewModel(YTVideoInfo, {
            translate: t,
            liked: actionData?.liked,
            disliked: actionData?.disliked,
            canDownload: Boolean(download),
            canOpenComments: true,
          })
        : undefined,
    [YTVideoInfo, actionData?.disliked, actionData?.liked, download, t],
  );

  const onSubscribe = useCallback(
    (next: boolean) => {
      const channelId = YTVideoInfo?.channel_id;

      if (!channelId) {
        LOGGER.warn("Video has no channel id, cannot change subscription");
        return;
      }

      // Optimistic: the button is the only feedback the request has.
      setSubscribed(next);
      (next ? subscribe(channelId) : unsubscribe(channelId))?.catch(reason => {
        LOGGER.warn("Subscription change failed: ", reason);
        setSubscribed(!next);
      });
    },
    [YTVideoInfo?.channel_id, subscribe, unsubscribe],
  );

  const actions = useMemo<ActionBarItem[]>(() => {
    if (!model || !YTVideoInfo) {
      return [];
    }

    const handlers: Record<string, () => void> = {
      like: () =>
        (actionData?.liked ? removeRating() : like()).catch(LOGGER.warn),
      dislike: () =>
        (actionData?.disliked ? removeRating() : dislike()).catch(LOGGER.warn),
      save: () => save([YTVideoInfo.id]),
      download: () => download?.(YTVideoInfo.id)?.catch(LOGGER.warn),
      description: () => setPanel("description"),
      comments: () => setPanel("comments"),
      queue: () => setPanel("queue"),
    };

    return model.actions.map(action => ({
      ...action,
      onPress: handlers[action.id],
    }));
  }, [
    YTVideoInfo,
    actionData?.disliked,
    actionData?.liked,
    dislike,
    download,
    like,
    model,
    removeRating,
    save,
  ]);

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

  if (!videoUrl && !loading) {
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

  const header =
    model !== undefined ? (
      <VideoDetailHeader
        actions={actions}
        compact={detailLayout.reducedChrome}
        model={model}
        onOpenDescription={() => setPanel("description")}
        onSubscribe={onSubscribe}
        subscribed={subscribed}
      />
    ) : null;

  const player = (
    <View
      style={
        fullscreen
          ? styles.playerFullscreen
          : {aspectRatio: detailLayout.playerAspectRatio}
      }>
      {videoUrl && overlayEnabled ? (
        <PhoneOverlayPlayer
          // Autoplay swaps the video on this screen; a fresh player per video
          // starts without the ended state of the previous one.
          key={YTVideoInfo.id}
          VideoComponent={
            appSettings.vlcEnabled ? VideoPlayerVLC : VideoPlayerNative
          }
          VideoComponentProps={{
            url: videoUrl,
            audioUrl: playbackSource?.audioUri,
            startPosition: startTime ? startTime * 1000 : undefined,
            videoInfo: YTVideoInfo.originalData,
            onPlaybackFailure: reportPlaybackFailure,
            // Kept from the native-controls player of this screen.
            playInBackground: Platform.OS === "android",
            enterPictureInPictureOnLeave: Platform.OS === "ios",
            ignoreSilentSwitch: "ignore",
          }}
          videoID={YTVideoInfo.id}
          title={YTVideoInfo.title}
          subtitles={YTVideoInfo.subtitles}
          chapters={YTVideoInfo.chapters}
          storyboard={YTVideoInfo.storyboard}
          endscreen={YTVideoInfo.endscreen}
          fullscreen={fullscreen}
          onToggleFullscreen={toggleFullscreen}
          onOpenSettings={() => setPanel("playerSettings")}
          onClose={
            navigation.canGoBack() ? () => navigation.goBack() : undefined
          }
          onProgress={data => reportProgress(data.currentTime)}
          onEnd={reportEnded}
          upNext={upNext}
          autoplay={autoplay}
          onToggleAutoplay={() => updateSettings({autoplayEnabled: !autoplay})}
          onPlayNext={next =>
            // The same screen instead of a replaced one, so full screen and
            // its orientation survive the switch, as in the YouTube app.
            navigation.setParams({
              videoId: next.videoId,
              navEndpoint: next.navEndpoint,
              startSeconds: undefined,
            })
          }
        />
      ) : videoUrl ? (
        <VideoPlayerPhone
          onPipPress={() => videoRef.current?.pause()}
          ref={videoRef}
          sourceURL={videoUrl}
          onProgress={data => reportProgress(data.currentTime)}
          onEnd={reportEnded}
          style={styles.player}
        />
      ) : (
        <VideoDetailSkeleton metadataOnly />
      )}
    </View>
  );

  const feed = (
    <MediaFeed
      ListHeaderComponent={detailLayout.metadataBesidePlayer ? null : header}
      items={watchNextFeed ?? []}
      loading={loading}
      onEndReached={fetchNextVideoContinue}
      testID={"watch-next-feed"}
    />
  );

  const split = detailLayout.mode === "split" && !fullscreen;

  return (
    <View
      style={[
        styles.container,
        {backgroundColor: fullscreen ? "black" : theme.colors.background},
      ]}>
      <StatusBar hidden={fullscreen} animated />
      {/* Android only; the bar comes back with a swipe from the edge. */}
      <NavigationBar hidden={fullscreen} />
      {/*
        Stacked and split share one tree. The player has to keep its exact
        place in it: rendering it from two different branches makes React
        unmount and remount the native video on every rotation, and playback
        starts over from the beginning. Only styles change between the two
        arrangements.
      */}
      <View style={[styles.body, split && styles.bodySplit]}>
        <View
          style={[
            styles.playerColumn,
            split && styles.playerColumnSplit,
            split && {width: `${detailLayout.playerColumnRatio * 100}%`},
            fullscreen && styles.playerColumnFullscreen,
          ]}>
          {player}
          {split ? (
            <ScrollView style={styles.metadataColumn}>{header}</ScrollView>
          ) : null}
        </View>
        {/* Hidden instead of unmounted: the feed keeps its scroll position. */}
        <View style={[styles.feedColumn, fullscreen && styles.hidden]}>
          {feed}
        </View>
      </View>
      <SheetPanel
        onClose={() => setPanel(undefined)}
        open={panel === "description"}
        subtitle={model?.metadataLine}
        title={t("video.description.title")}>
        <VideoDescriptionPanel description={model?.description} inSheet />
      </SheetPanel>
      <SheetPanel
        onClose={() => setPanel(undefined)}
        open={panel === "comments"}
        subtitle={
          comments.count
            ? t("video.comments.count", {count: comments.count})
            : undefined
        }
        title={t("video.comments.title")}>
        <CommentList
          comments={comments.comments}
          error={comments.error}
          inSheet
          loading={comments.loading}
          loadingMore={comments.loadingMore}
          onEndReached={comments.fetchMore}
          onRetry={comments.retry}
        />
      </SheetPanel>
      {overlayEnabled ? (
        <PhoneVideoSettingsSheet
          onClose={() => setPanel(undefined)}
          open={panel === "playerSettings"}
        />
      ) : null}
      {model?.queue ? (
        <SheetPanel
          onClose={() => setPanel(undefined)}
          open={panel === "queue"}
          subtitle={model.queue.positionLabel}
          title={model.queue.title}>
          <VideoQueuePanel
            entries={YTVideoInfo.playlist?.content ?? []}
            inSheet
            queue={model.queue}
          />
        </SheetPanel>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  bodySplit: {
    flexDirection: "row",
  },
  playerColumn: {
    width: "100%",
  },
  playerColumnSplit: {
    height: "100%",
  },
  metadataColumn: {
    flex: 1,
  },
  feedColumn: {
    flex: 1,
  },
  player: {
    width: "100%",
    height: "100%",
  },
  playerColumnFullscreen: {
    flex: 1,
  },
  playerFullscreen: {
    flex: 1,
  },
  hidden: {
    display: "none",
  },
});
