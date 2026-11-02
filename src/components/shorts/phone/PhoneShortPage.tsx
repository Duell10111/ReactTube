import {MaterialIcons} from "@expo/vector-icons";
import {useNavigation} from "@react-navigation/native";
import {Image} from "expo-image";
import React, {memo, useEffect, useState} from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {ResizeMode} from "react-native-video";

import VideoComponent from "@/components/VideoComponent";
import {shortPreviewUri} from "@/components/shorts/phone/shortsPagingModel";
import useVideoDetails from "@/hooks/useVideoDetails";
import {useTranslation} from "@/localization";
import {RootNavProp} from "@/navigation/RootStackNavigator";
import {ErrorState} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";
import {YTNodes} from "@/utils/Youtube";

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
  } = useVideoDetails(initialEndpoint ?? videoId);
  const navigation = useNavigation<RootNavProp>();
  const {t} = useTranslation();
  const {theme} = useAppTheme();
  const {bottom, left, right} = useSafeAreaInsets();
  const [paused, setPaused] = useState(false);

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

  return (
    <>
      {preview ? (
        <Image
          contentFit={"contain"}
          source={{uri: preview}}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {YTVideoInfo && videoUrl && mountPlayer ? (
        <ShortPlayer
          key={playbackAttemptKey ?? videoUrl}
          url={videoUrl}
          startPositionSeconds={startTime}
          onPlaybackFailure={reportPlaybackFailure}
          onPlaybackActive={onPlaybackActive}
          onPlaybackAdvanced={onPlaybackAdvanced}
          playbackAttemptKey={playbackAttemptKey}
          onProgress={data => {
            if (!active || !playing || paused) return;
            reportProgress(data.currentTime);
          }}
          style={StyleSheet.absoluteFill}
          videoInfo={YTVideoInfo}
          fullscreen={false}
          paused={paused || !active || !playing}
          backgroundPlayback={false}
          controls={false}
          repeat
          resizeMode={ResizeMode.CONTAIN}
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
        <View
          pointerEvents={active ? "box-none" : "none"}
          style={[
            styles.metadata,
            {
              paddingBottom: bottom + 16,
              paddingLeft: left + 16,
              paddingRight: right + 16,
            },
          ]}>
          <Pressable
            accessibilityRole={"button"}
            disabled={!YTVideoInfo.channel_id}
            onPress={() =>
              YTVideoInfo.channel_id &&
              navigation.navigate("ChannelScreen", {
                channelId: YTVideoInfo.channel_id,
              })
            }
            style={styles.channel}>
            {YTVideoInfo.author?.thumbnail?.url ? (
              <Image
                source={{uri: YTVideoInfo.author.thumbnail.url}}
                style={styles.avatar}
              />
            ) : null}
            <Text numberOfLines={1} style={styles.channelName}>
              {YTVideoInfo.channel?.name ?? YTVideoInfo.author?.name}
            </Text>
          </Pressable>
          <Text numberOfLines={3} style={styles.title}>
            {YTVideoInfo.title}
          </Text>
        </View>
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
  metadata: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    backgroundColor: "#00000080",
    paddingTop: 12,
  },
  channel: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  channelName: {
    flexShrink: 1,
    color: "white",
    fontSize: 17,
    fontWeight: "600",
  },
  title: {
    color: "white",
    fontSize: 15,
  },
});
