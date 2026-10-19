import React, {forwardRef} from "react";
import {Platform, ViewStyle} from "react-native";
import {VideoRef, ResizeMode, type OnProgressData} from "react-native-video";

import VideoWrapper from "@/components/corner-video/components/VideoWrapper";
import {
  usePlaybackWatchdog,
  withPlaybackWatchdog,
} from "@/hooks/video/usePlaybackWatchdog";

interface VideoPlayerPhoneProps {
  sourceURL: string;
  startPositionSeconds?: number;
  playbackAttemptKey?: string;
  onPlaybackFailure?: (reason: string) => void;
  onPlaybackActive?: (active: boolean) => void;
  onPlaybackAdvanced?: () => void;
  onProgress?: (data: OnProgressData) => void;
  style?: ViewStyle;
  onPipPress?: () => void;
  children?: React.ReactElement;
}

export const VideoPlayerPhone = forwardRef<VideoRef, VideoPlayerPhoneProps>(
  (
    {
      sourceURL,
      style,
      onPipPress,
      children,
      startPositionSeconds,
      playbackAttemptKey,
      onPlaybackFailure,
      onPlaybackActive,
      onPlaybackAdvanced,
      onProgress,
    },
    ref,
  ) => {
    const watchdog = usePlaybackWatchdog({
      sourceKey: playbackAttemptKey ?? sourceURL,
      onFailure: onPlaybackFailure,
      onActive: onPlaybackActive,
      onAdvance: onPlaybackAdvanced,
    });
    return (
      <VideoWrapper
        key={playbackAttemptKey ?? sourceURL}
        style={style}
        cornerProps={{
          width: 300,
          height: 250,
          top: 50,
          bottom: 50,
          left: 7,
          right: 7,
        }}
        videoProps={{
          // @ts-ignore
          source: {
            uri: sourceURL,
            startPosition: (startPositionSeconds ?? 0) * 1000,
          },
          ...withPlaybackWatchdog(watchdog, {onProgress}),
          resizeMode: ResizeMode.CONTAIN,
          controls: true,
          // TODO: Check if working correctly on android and ios
          playInBackground: Platform.OS === "android",
          enterPictureInPictureOnLeave: Platform.OS === "ios",
          ignoreSilentSwitch: "ignore",
        }}
        onPress={onPipPress}
        ref={ref}
        children={children}
      />
    );
  },
);
