import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {DeviceEventEmitter, useTVEventHandler, View} from "react-native";
import {
  OnAudioTracksData,
  OnLoadData,
  OnProgressData,
  OnSeekData,
  OnVideoErrorData,
} from "react-native-video";

import BottomControls from "./BottomControls";
import EndCardContainer from "./EndCardContainer";
import {useAnimations} from "./hooks/useAnimations";
import {useControlTimeout} from "./hooks/useControlTimeout";
import useTVSeekControl from "./hooks/useTVSeekControl";
import {usePanResponders} from "./usePanResponders";

import {useVideoPlayerSettings} from "@/components/video/videoPlayer/settings/VideoPlayerSettingsContext";
import {useSponsorBlock} from "@/utils/SponsorBlockProvider";

export const PausePlayerEvent = "PlayerPauseVideo";
export const EndCardCloseEvent = "EndCardClose";

export interface VideoMetadata {
  title: string;
  author: string;
  authorID: string;
  authorThumbnailUrl: string;
  onAuthorPress: () => void;
  views: string;
  videoDate: string;
  liked?: boolean;
  disliked?: boolean;
  onLike?: () => void;
  onDislike?: () => void;
  onSaveVideo?: () => void;
  onRefresh?: () => void;
}

// TODO: Use own types
export interface VideoComponentType<T> {
  paused: boolean;
  rate?: number;
  audioTrackIndex?: number;
  // Events
  onLoad: (loadData: OnLoadData) => void;
  onSeek: (seekData: OnSeekData) => void;
  onProgress: (progressData: OnProgressData) => void;
  onError: (errorData: OnVideoErrorData) => void;
  onEnd: () => void;
  onAudioTracks: (audioTracks: OnAudioTracksData) => void;
  // Additional props
  props: T;
}

export interface VideoComponentRefType {
  seek: (seconds: number) => void;
  getCurrentPositionSeconds: () => Promise<number>;
}

export interface VideoPlayerRefs {
  seek: (seconds: number) => void;
  getCurrentPositionSeconds: () => Promise<number>;
  pause: () => void;
}

interface VideoPlayerProps<T> {
  VideoComponent: typeof React.Component<
    VideoComponentType<T>,
    VideoComponentRefType
  >;
  VideoComponentProps: T;
  bottomContainer?: React.ReactNode;
  metadata: VideoMetadata;
  endCardContainer: React.ReactNode;
  endCardStartSeconds?: number;
  // Callbacks
  onAuthorClick?: () => void;
  onProgress?: (progressData: OnProgressData) => void;
  onEnd?: () => void;

  // Custom Props
  // Used by Sponsor block only
  videoID: string;
}

const sponsorSeekReplacement = (seconds: number) => {
  console.warn(
    "Provided VideoPlayer ref does not contain seek function. Providing NOOP",
  );
};

const VideoPlayer = forwardRef<VideoPlayerRefs, VideoPlayerProps<any>>(
  (
    {
      VideoComponent,
      bottomContainer,
      endCardContainer,
      onProgress,
      onEnd,
      ...props
    },
    ref,
  ) => {
    const animations = useAnimations(450);

    const mounted = useRef(false);
    const _videoRef = useRef<VideoComponentRefType>(null);
    const controlTimeout = useRef<ReturnType<typeof setTimeout>>(
      setTimeout(() => {}),
    );

    // const [_resizeMode, setResizeMode] = useState<ResizeMode>(resizeMode);
    const [_paused, setPaused] = useState<boolean>(false);
    const [_muted, setMuted] = useState<boolean>(false);

    const [seekerPosition, setSeekerPositionState] = useState(0);
    const [seekerFillWidth, setSeekerFillWidth] = useState<number>(0);
    const [seekerOffset, setSeekerOffset] = useState(0);
    const [seekerWidth, setSeekerWidth] = useState(0);
    const [seeking, setSeeking] = useState(false);
    const [seekerFocus, setSeekerFocus] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);

    const [showControls, setShowControls] = useState(false);
    const [showEndcard, setShowEndcard] = useState(false);

    const [loading, setLoading] = useState(true);
    const [duration, setDuration] = useState(0);

    const [resolution, setResolution] = useState<string>();

    const constrainToSeekerMinMax = useCallback(
      (val = 0) => {
        if (val <= 0) {
          return 0;
        } else if (val >= seekerWidth) {
          return seekerWidth;
        }
        return val;
      },
      [seekerWidth],
    );

    const setSeekerPosition = useCallback(
      (position = 0) => {
        const positionValue = constrainToSeekerMinMax(position);
        setSeekerPositionState(positionValue);
        setSeekerOffset(positionValue);
        setSeekerFillWidth(positionValue);
      },
      [constrainToSeekerMinMax],
    );

    function _onLoad(data: OnLoadData) {
      setDuration(data.duration);
      setLoading(false);

      if (showControls) {
        setControlTimeout();
      }

      setResolution(`${data.naturalSize.height}p`);

      // if (typeof onLoad === 'function') {
      //   onLoad(data);
      // }
    }

    function _onProgress(data: OnProgressData) {
      // console.log("Progress: ", data);
      if (!seeking) {
        setCurrentTime(data.currentTime);

        onProgress?.(data);

        // if (typeof onProgress === 'function') {
        //   onProgress(data);
        // }
      }
      // setResolution()
    }

    const _onSeek = (data: OnSeekData) => {
      // if (!seeking) {
      //   setControlTimeout();
      // }
      setCurrentTime(data.seekTime);

      // if (typeof onSeek === "function") {
      //   onSeek(obj);
      // }
    };

    const _onEnd = () => {
      if (currentTime < duration) {
        setCurrentTime(duration);
        // setPaused(!props.repeat);

        //   if (showOnEnd) {
        //     setShowControls(!props.repeat);
        //   }
      }

      if (typeof onEnd === "function") {
        onEnd();
      }
    };

    useEffect(() => {
      if (showControls && !loading && !showEndcard) {
        animations.showControlAnimation();
        setControlTimeout();
        // typeof events.onShowControls === 'function' && events.onShowControls();
      } else {
        animations.hideControlAnimation();
        clearControlTimeout();
        // typeof events.onHideControls === 'function' && events.onHideControls();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showControls, loading, showEndcard]);

    useEffect(() => {
      animations.showEndCard.value = showEndcard;
    }, [showEndcard]);

    const endCardShownRef = useRef(false);

    useEffect(() => {
      // @ts-ignore TODO: fix
      if (!endCardShownRef.current && currentTime > props.endCardStartSeconds) {
        setShowEndcard(true);
        endCardShownRef.current = true;
      } else if (
        endCardShownRef.current &&
        // @ts-ignore TODO: fix
        currentTime < props.endCardStartSeconds
      ) {
        endCardShownRef.current = false;
      }
    }, [currentTime]);

    useEffect(() => {
      const sub = DeviceEventEmitter.addListener(EndCardCloseEvent, () => {
        setShowEndcard(false);
      });
      return () => sub.remove();
    }, []);

    useEffect(() => {
      const sub = DeviceEventEmitter.addListener(PausePlayerEvent, () => {
        setPaused(true);
      });
      return () => sub.remove();
    }, []);

    //TODO: Add support for back event to dismiss EndCard/Controls
    // Currently not working with native screen stack
    // https://github.com/software-mansion/react-native-screens/pull/801

    const longButtonPressed = useRef<string>();

    useTVEventHandler(event => {
      switch (event.eventType) {
        case "select":
        case "up":
        case "down":
        case "right":
        case "left":
          if (showEndcard) {
            return;
          }
          // console.log("Control Timeout Triggered! ", event.eventType);
          if (!showControls) {
            setShowControls(true);
            resetControlTimeout();
            setControlTimeout();
          } else {
            resetControlTimeout();
            setControlTimeout();
          }
          break;
        case "longLeft":
        case "longRight":
          // Special treatment for longLeft/Right
          // console.log("LONG Control Timeout Triggered! ", event.eventType);
          // console.log("Current: ", longButtonPressed.current);
          if (
            (event.eventType === "longLeft" ||
              event.eventType === "longRight") &&
            !longButtonPressed.current
          ) {
            longButtonPressed.current = event.eventType;
            // console.log("Disabling Timeout!");
            clearControlTimeout();
          } else if (event.eventType === longButtonPressed.current) {
            // console.log("Activating Timeout again!");
            longButtonPressed.current = undefined;
            setControlTimeout();
          }
          break;
        case "longUp":
          setShowEndcard(true);
          break;
        case "longDown":
          setShowEndcard(false);
          break;
      }
    });

    // console.log("Endcard: ", showEndcard);
    // console.log("Endcard Ani ", animations.showEndCard.value);

    // const events = {
    //   onError: onError || _onError,
    //   onBack: (onBack || _onBack(navigator)) as () => void,
    //   onEnd: _onEnd,
    //   onScreenTouch: _onScreenTouch,
    //   onEnterFullscreen,
    //   onExitFullscreen,
    //   onShowControls,
    //   onHideControls,
    //   onLoadStart: _onLoadStart,
    //   onProgress: _onProgress,
    //   onSeek: _onSeek,
    //   onLoad: _onLoad,
    //   onPause,
    //   onPlay,
    // };

    const {clearControlTimeout, resetControlTimeout, setControlTimeout} =
      useControlTimeout({
        controlTimeout,
        controlTimeoutDelay: 4000,
        mounted: mounted.current,
        showControls,
        setShowControls,
        alwaysShowControls: false,
      });

    useTVSeekControl({
      duration,
      currentTime,
      setSeekerPosition,
      seekerWidth,
      seeking,
      clearControlTimeout: () => {},
      enabled: seekerFocus,
      seekerPosition,
      setSeeking,
      seek: _videoRef?.current?.seek,
      pause: _paused,
      setPause: setPaused,
    });

    const {seekPanResponder} = usePanResponders({
      duration,
      seekerOffset,
      loading: false,
      seekerWidth,
      seeking,
      seekerPosition,
      seek: _videoRef?.current?.seek,
      clearControlTimeout,
      setSeekerPosition,
      setSeeking,
      // setControlTimeout,
      onEnd: _onEnd,
      horizontal: false, // TODO: Adapt
      inverted: false, // TODO: Adapt
    });

    useEffect(() => {
      mounted.current = true;
      return () => {
        mounted.current = false;
        clearControlTimeout();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // console.log("CurrTime: ", currentTime);
    // console.log("Duration: ", duration);
    // console.log("Seeker Position: ", seekerPosition);
    // console.log("Seeker Width: ", seekerWidth);

    useEffect(() => {
      if (!seeking && currentTime && duration) {
        const percent = currentTime / duration;
        const position = seekerWidth * percent;

        setSeekerPosition(position);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentTime, duration, seekerWidth, setSeekerPosition]);

    useImperativeHandle(ref, () => {
      return {
        pause: () => setPaused(true),
        seek: seconds => _videoRef.current?.seek(seconds),
        getCurrentPositionSeconds: async () =>
          (await _videoRef.current?.getCurrentPositionSeconds()) ?? 0,
      };
    }, []);

    useSponsorBlock(
      props.videoID,
      currentTime,
      _videoRef.current?.seek ?? sponsorSeekReplacement,
    );

    const {speed, selectedLanguage, setLanguages} = useVideoPlayerSettings();

    return (
      <View style={{flex: 1}}>
        <VideoComponent
          audioTrackIndex={selectedLanguage?.index}
          onLoad={_onLoad}
          onProgress={_onProgress}
          paused={seeking || _paused}
          rate={speed}
          onEnd={_onEnd}
          onSeek={_onSeek}
          onError={() => {}}
          onAudioTracks={tracks => {
            setLanguages(tracks.audioTracks);
          }}
          props={props.VideoComponentProps}
          // @ts-ignore
          ref={_videoRef}
        />
        {endCardContainer ? (
          <EndCardContainer
            showEndCard={animations.showEndCard}
            onCloseEndCard={() => setShowEndcard(false)}>
            {endCardContainer}
          </EndCardContainer>
        ) : null}
        <>
          {/* @ts-ignore Ignore missing props for the moment */}
          <BottomControls
            animations={animations}
            resetControlTimeout={resetControlTimeout}
            seekerFillWidth={seekerFillWidth}
            setSeekerWidth={setSeekerWidth}
            setSeekerFocus={setSeekerFocus}
            seekerPosition={seekerPosition}
            panHandlers={seekPanResponder}
            showTimeRemaining={false}
            duration={duration}
            currentTime={currentTime}
            showDuration
            bottomContainer={bottomContainer}
            metadata={props.metadata}
            resolution={resolution}
            showControls={showControls}
            setPaused={setPaused}
            onJumpToStart={() => _videoRef.current?.seek(0)}
          />
        </>
      </View>
    );
  },
);

export default VideoPlayer;
