import {useIsFocused} from "@react-navigation/native";
import {NativeStackScreenProps} from "@react-navigation/native-stack";
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {ScrollView, StyleSheet, View} from "react-native";
import {VideoRef} from "react-native-video";

import {VideoPlayerPhone} from "@/components/video/phone/VideoPlayerPhone";
import {useDownloaderContext} from "@/context/DownloaderContext";
import {useMusikPlayerContext} from "@/context/MusicPlayerContext";
import {usePlaylistManagerContext} from "@/context/PlaylistManagerContext";
import useChannelManager from "@/hooks/channel/useChannelManager";
import useVideoComments from "@/hooks/comments/useVideoComments";
import useOrientationChange from "@/hooks/ui/useOrientationChange";
import useVideoDetails from "@/hooks/useVideoDetails";
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

type PanelId = "description" | "comments" | "queue";

/**
 * Video detail for phone and tablet. One screen for both: the difference
 * between them is the arrangement, and that is decided by `getVideoDetailLayout`
 * from the layout class and the orientation, not by the device type.
 */
export default function VideoDetailScreen({route}: Props) {
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
  } = useVideoDetails(navEndpoint ?? videoId);

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
      like: () => (actionData?.liked ? removeRating() : like()),
      dislike: () => (actionData?.disliked ? removeRating() : dislike()),
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
    <View style={{aspectRatio: detailLayout.playerAspectRatio}}>
      {videoUrl ? (
        <VideoPlayerPhone
          onPipPress={() => videoRef.current?.pause()}
          ref={videoRef}
          sourceURL={videoUrl}
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

  return (
    <View
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      {detailLayout.mode === "split" ? (
        <View style={styles.split}>
          <View
            style={[
              styles.playerColumn,
              {width: `${detailLayout.playerColumnRatio * 100}%`},
            ]}>
            {player}
            <ScrollView style={styles.metadataColumn}>{header}</ScrollView>
          </View>
          <View style={styles.feedColumn}>{feed}</View>
        </View>
      ) : (
        <>
          {player}
          <View style={styles.feedColumn}>{feed}</View>
        </>
      )}
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
  split: {
    flex: 1,
    flexDirection: "row",
  },
  playerColumn: {
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
});
