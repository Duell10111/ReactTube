import {MaterialIcons} from "@expo/vector-icons";
import {useNavigation} from "@react-navigation/native";
import {Image} from "expo-image";
import React, {memo, useCallback, useEffect, useState} from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  View,
} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {ResizeMode} from "react-native-video";

import VideoComponent from "@/components/VideoComponent";
import {ShortOverlay} from "@/components/shorts/phone/ShortOverlay";
import {
  getShortLikeCount,
  getShortShareUrl,
  shouldShortFillScreen,
} from "@/components/shorts/phone/shortActionsModel";
import {shortPreviewUri} from "@/components/shorts/phone/shortsPagingModel";
import {useAccountContext} from "@/context/AccountContext";
import {usePlaylistManagerContext} from "@/context/PlaylistManagerContext";
import useChannelManager from "@/hooks/channel/useChannelManager";
import useVideoDetails from "@/hooks/useVideoDetails";
import {useTranslation} from "@/localization";
import {RootNavProp} from "@/navigation/RootStackNavigator";
import {ErrorState} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";
import Logger from "@/utils/Logger";
import {YTNodes} from "@/utils/Youtube";

const LOGGER = Logger.extend("SHORTS");

interface Props {
  videoId: string;
  initialEndpoint?: YTNodes.NavigationEndpoint;
  active: boolean;
  nearby: boolean;
  preload: boolean;
  playing: boolean;
  width: number;
  height: number;
  onPrepared: (videoId: string) => void;
  /** Opens the comments of this short; the sheet lives above the pager. */
  onOpenComments: (videoId: string, count?: string) => void;
  /** The pager holds still while the progress bar is dragged. */
  onScrubbingChange: (scrubbing: boolean) => void;
}

/** List cells stay cheap; only visited neighbours and the next short load data. */
export const PhoneShortPage = memo(function PhoneShortPage(props: Props) {
  const {active, nearby, preload, width, height} = props;
  const [prepared, setPrepared] = useState(false);
  const enabled = active || preload;
  useEffect(() => {
    setPrepared(previous => nearby && (previous || enabled));
  }, [enabled, nearby]);

  return (
    <View
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? "auto" : "no-hide-descendants"}
      style={[styles.page, {width, height}]}>
      {nearby && (enabled || prepared) ? <PreparedShort {...props} /> : null}
    </View>
  );
});

function PreparedShort({
  videoId,
  initialEndpoint,
  active,
  preload,
  playing,
  onPrepared,
  onOpenComments,
  onScrubbingChange,
  width,
  height,
}: Props) {
  const {
    YTVideoInfo,
    videoUrl,
    loading,
    error,
    startTime,
    refresh,
    reportPlaybackFailure,
    onPlaybackActive,
    onPlaybackAdvanced,
    playbackAttemptKey,
    playbackFailureKey,
    reportProgress,
    trackWatchProgress,
    actionData,
    like,
    removeRating,
  } = useVideoDetails(initialEndpoint ?? videoId);
  const navigation = useNavigation<RootNavProp>();
  const {t, formatNumber} = useTranslation();
  const {theme} = useAppTheme();
  const {bottom, left, right} = useSafeAreaInsets();
  const [paused, setPaused] = useState(false);
  const [position, setPosition] = useState({current: 0, duration: 0});
  const [seekTo, setSeekTo] = useState<{seconds: number}>();
  const seek = useCallback((seconds: number) => {
    setSeekTo({seconds});
    // Shown at once; the next progress event confirms it.
    setPosition(previous => ({...previous, current: seconds}));
  }, []);
  const {loginData} = useAccountContext();
  const signedIn = loginData.accounts.length > 0;
  const {save} = usePlaylistManagerContext();
  const {subscribe, unsubscribe} = useChannelManager();
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    setSubscribed(YTVideoInfo?.subscribed ?? false);
  }, [YTVideoInfo?.subscribed]);

  const toggleSubscription = useCallback(() => {
    const channelId = YTVideoInfo?.channel_id;
    if (!channelId) return;
    const next = !subscribed;
    // Optimistic: the button is the only feedback the request has.
    setSubscribed(next);
    (next ? subscribe(channelId) : unsubscribe(channelId))?.catch(reason => {
      LOGGER.warn("Subscription change failed: ", reason);
      setSubscribed(!next);
    });
  }, [YTVideoInfo?.channel_id, subscribe, subscribed, unsubscribe]);

  const liked = actionData?.liked ?? YTVideoInfo?.liked ?? false;
  const likeCount = getShortLikeCount(
    YTVideoInfo?.likeCount,
    YTVideoInfo?.liked ?? false,
    liked,
  );
  const commentCount = YTVideoInfo?.commentsEntryPointHeader?.comments_count;
  const withCount = (label: string, count?: string) =>
    count ? t("shorts.action.withCount", {label, count}) : label;
  const likeCaption =
    likeCount !== undefined ? formatNumber(likeCount) : undefined;

  useEffect(() => {
    if (active) setPaused(false);
  }, [active]);

  useEffect(() => {
    if (active && (videoUrl || !loading)) onPrepared(videoId);
  }, [active, loading, onPrepared, videoId, videoUrl]);

  // Android SurfaceViews can cover adjacent cells, even with clipping enabled.
  const mountPlayer = active || (preload && Platform.OS === "ios");
  const unavailable = !videoUrl && !loading && (error || YTVideoInfo);
  const preview = shortPreviewUri(YTVideoInfo?.thumbnailImage);
  const fill = shouldShortFillScreen(YTVideoInfo?.frameSize, {
    width,
    height,
  });

  return (
    <>
      {preview ? (
        <Image
          contentFit={fill ? "cover" : "contain"}
          source={{uri: preview}}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {YTVideoInfo && videoUrl && mountPlayer ? (
        <ShortPlayer
          seekTo={seekTo}
          key={playbackAttemptKey ?? videoUrl}
          url={videoUrl}
          startPositionSeconds={startTime}
          onPlaybackFailure={reportPlaybackFailure}
          onPlaybackActive={onPlaybackActive}
          onPlaybackAdvanced={onPlaybackAdvanced}
          playbackAttemptKey={playbackAttemptKey}
          onProgress={data => {
            if (!active || !playing || paused) return;
            setPosition({
              current: data.currentTime,
              duration: data.seekableDuration,
            });
            reportProgress(data.currentTime);
            trackWatchProgress(data.currentTime);
          }}
          style={StyleSheet.absoluteFill}
          videoInfo={YTVideoInfo}
          fullscreen={false}
          paused={paused || !active || !playing}
          backgroundPlayback={false}
          controls={false}
          repeat
          resizeMode={fill ? ResizeMode.COVER : ResizeMode.CONTAIN}
        />
      ) : null}
      {active && unavailable ? (
        <View
          style={[styles.centered, {backgroundColor: theme.colors.background}]}>
          <ErrorState
            title={t("video.unavailable.title")}
            message={
              playbackFailureKey
                ? t(playbackFailureKey)
                : (YTVideoInfo?.originalData.playability_status?.reason ??
                  t("video.unavailable.message"))
            }
            onRetry={() => refresh()}
          />
        </View>
      ) : active ? (
        <>
          <Pressable
            accessibilityRole={"button"}
            accessibilityLabel={t(
              paused ? "video.player.play" : "video.player.pause",
            )}
            accessibilityHint={t("shorts.player.touchHint")}
            onPress={() => setPaused(previous => !previous)}
            style={StyleSheet.absoluteFill}
          />
          {!videoUrl ? (
            <View pointerEvents={"none"} style={styles.centered}>
              <ActivityIndicator color={"white"} size={"large"} />
            </View>
          ) : paused ? (
            <View pointerEvents={"none"} style={styles.centered}>
              <View style={styles.pauseBadge}>
                <MaterialIcons name={"play-arrow"} color={"white"} size={56} />
              </View>
            </View>
          ) : null}
        </>
      ) : null}
      {YTVideoInfo && !unavailable ? (
        <ShortOverlay
          actions={[
            {
              id: "like",
              icon: liked ? "favorite" : "favorite-border",
              caption: likeCaption ?? t("video.action.like"),
              accessibilityLabel: withCount(
                t("video.action.like"),
                likeCaption,
              ),
              active: liked,
              onPress: () =>
                (liked ? removeRating() : like()).catch(LOGGER.warn),
            },
            {
              id: "comments",
              icon: "chat-bubble-outline",
              caption: commentCount ?? t("video.action.comments"),
              accessibilityLabel: withCount(
                t("video.action.comments"),
                commentCount,
              ),
              onPress: () => onOpenComments(YTVideoInfo.id, commentCount),
            },
            {
              id: "save",
              icon: "bookmark-border",
              caption: t("video.action.save"),
              accessibilityLabel: t("video.action.save"),
              onPress: () => save([YTVideoInfo.id]),
            },
            {
              id: "share",
              icon: "reply",
              caption: t("shorts.action.share"),
              accessibilityLabel: t("shorts.action.share"),
              onPress: () => {
                const url = getShortShareUrl(YTVideoInfo.id);
                Share.share(
                  Platform.OS === "ios" ? {url} : {message: url},
                ).catch(LOGGER.warn);
              },
            },
          ]}
          avatarUrl={YTVideoInfo.author?.thumbnail?.url}
          channelName={YTVideoInfo.channel?.name ?? YTVideoInfo.author?.name}
          insets={{bottom, left, right}}
          interactive={active}
          onOpenChannel={
            YTVideoInfo.channel_id
              ? () =>
                  navigation.navigate("ChannelScreen", {
                    channelId: YTVideoInfo.channel_id!,
                  })
              : undefined
          }
          onToggleSubscription={
            signedIn && YTVideoInfo.channel_id ? toggleSubscription : undefined
          }
          currentSeconds={position.current}
          durationSeconds={
            position.duration > 0
              ? position.duration
              : YTVideoInfo.durationSeconds
          }
          onScrubbingChange={onScrubbingChange}
          onSeek={seek}
          subscribed={signedIn ? subscribed : undefined}
          title={YTVideoInfo.title}
        />
      ) : null}
    </>
  );
}

/** Keep the preview visible until the native player has a frame to display. */
function ShortPlayer(props: React.ComponentProps<typeof VideoComponent>) {
  const [ready, setReady] = useState(false);

  return (
    <VideoComponent
      {...props}
      onReadyForDisplay={() => setReady(true)}
      style={[StyleSheet.absoluteFill, {opacity: ready ? 1 : 0}]}
    />
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: "black",
    overflow: "hidden",
  },
  centered: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  pauseBadge: {
    padding: 12,
    borderRadius: 50,
    backgroundColor: "#00000099",
  },
});
