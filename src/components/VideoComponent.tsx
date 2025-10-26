import {useIsFocused} from "@react-navigation/native";
import React, {useEffect, useMemo, useRef, useState} from "react";
import {
  ActivityIndicator,
  Platform,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from "react-native";
import Video, {
  Chapters,
  OnProgressData,
  ResizeMode,
  VideoRef,
} from "react-native-video";

import Logger from "../utils/Logger";

import {YTChapter, YTVideoInfo} from "@/extraction/Types";

const LOGGER = Logger.extend("VIDEO");

interface Props {
  url: string;
  hlsUrl?: string;
  style?: StyleProp<ViewStyle>;
  videoInfo?: YTVideoInfo;
  chapters?: YTChapter[];
  fullscreen?: boolean;
  onEndReached?: () => void;
  onPlaybackInfoUpdate?: (playbackInfos: {
    width: number;
    height: number;
  }) => void;
  // Reels controls
  paused?: boolean;
  controls?: boolean;
  repeat?: boolean;
  resizeMode?: ResizeMode;
  onProgress?: (data: OnProgressData) => void;
}

export default function VideoComponent({
  url,
  hlsUrl,
  videoInfo,
  fullscreen,
  style,
  paused,
  controls,
  repeat,
  resizeMode,
  ...callbacks
}: Props) {
  const playerRef = useRef<VideoRef>(undefined);
  const isFocused = useIsFocused();
  const [failbackURL, setFailbackUrl] = useState(false);

  const parsedChapters = useMemo(() => {
    return videoInfo?.chapters?.map(mapChapters) ?? [];
  }, [videoInfo?.chapters]);

  useEffect(() => {
    if (fullscreen) {
      playerRef.current?.presentFullscreenPlayer();
    } else {
      playerRef.current?.dismissFullscreenPlayer();
    }
  }, [fullscreen]);

  // As changing url causes duplicate errors
  if (failbackURL) {
    return (
      <VideoComponent
        url={url}
        style={style}
        videoInfo={videoInfo}
        {...callbacks}
      />
    );
  }

  const videoURL = hlsUrl ?? url;

  return (
    <>
      <ActivityIndicator style={styles.activityIndicator} size={"large"} />
      <Video
        key={videoURL}
        // @ts-ignore
        ref={playerRef}
        source={{
          // uri: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          // uri: "https://sample.vodobox.net/skate_phantom_flex_4k/skate_phantom_flex_4k.m3u8",
          // type: "m3u8",
          // uri: "https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd",
          // type: "mpd",
          // uri: `http://localhost:7500/video/${videoId}/master.m3u8`,
          uri: videoURL,
          metadata: {
            title: videoInfo?.title,
            subtitle: videoInfo?.author?.name,
            description: videoInfo?.description,
            imageUri: videoInfo?.thumbnailImage?.url,
          },
        }}
        style={
          (style as any) ?? [styles.fullScreen, StyleSheet.absoluteFillObject]
        }
        controls={controls !== undefined ? controls : true}
        paused={paused !== undefined ? paused : !isFocused}
        fullscreen={fullscreen ?? true}
        fullscreenOrientation={"landscape"}
        repeat={repeat}
        resizeMode={resizeMode ?? ResizeMode.CONTAIN}
        chapters={parsedChapters}
        playInBackground={Platform.isTV ? undefined : true}
        pictureInPicture
        // @ts-ignore type error?
        ignoreSilentSwitch={"ignore"}
        showNotificationControls
        // Event listener
        onLoad={(data: any) => {
          LOGGER.debug("Video Loading...", JSON.stringify(data, null, 4));
          callbacks.onPlaybackInfoUpdate?.({
            width: data?.naturalSize?.width,
            height: data?.naturalSize?.height,
          });
        }}
        onProgress={callbacks.onProgress}
        onLoadStart={() => LOGGER.debug("Video Start Loading...")}
        onError={(error: any) => {
          LOGGER.warn("Error playing video: ", JSON.stringify(error));
          if (hlsUrl) {
            setFailbackUrl(true);
            LOGGER.warn("Switching to fallback url");
          }
        }}
        onEnd={() => {
          LOGGER.debug("End reached");
          callbacks.onEndReached?.();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  activityIndicator: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
});

function mapChapters(chapter: YTChapter) {
  return {
    title: chapter.title,
    startTime: chapter.startDuration,
    endTime: chapter.endDuration,
  } as Chapters;
}
