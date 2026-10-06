import {useIsFocused} from "@react-navigation/native";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {BackHandler, DeviceEventEmitter, View} from "react-native";
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
import {getSeekerPositionForTime} from "./tvRemoteSeek";
import {usePanResponders} from "./usePanResponders";

import {isEndscreenShown} from "@/components/video/endcard/endscreenModel";
import {useVideoPlayerSettings} from "@/components/video/videoPlayer/settings/VideoPlayerSettingsContext";
import {useTVRemoteEvent} from "@/ui/tv";
import {formatResolutionLabel, PlaybackSize} from "@/utils/PlaybackSize";
import {useSponsorBlock} from "@/utils/SponsorBlockProvider";

export const PausePlayerEvent = "PlayerPauseVideo";

/** What the player tells the end card layer it renders. */
export interface EndscreenRenderState {
  currentTime: number;
  /** The user opened the cards before their time; show all of them. */
  forced: boolean;
  /** The cards own the remote. */
  browsing: boolean;
  /** Call once a card has been opened, so the player leaves browse mode. */
  onElementOpened: () => void;
}

export interface VideoMetadata {
  title: string;
  author: string;
  authorID: string;
  /** Missing while the channel is still loading, or when it has no avatar. */
  authorThumbnailUrl?: string;
  onAuthorPress: () => void;
  views: string;
  videoDate: string;
  liked?: boolean;
  disliked?: boolean;
  onLike?: () => void;
  onDislike?: () => void;
  onSaveVideo?: () => void;
  onRefresh?: () => void;
  /** Opens the side panel. Left out where a surface has none. */
  onShowDetails?: () => void;
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
  /** Rendered size on load and after every adaptive variant switch. */
  onPlaybackSizeChange?: (size: PlaybackSize) => void;
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
  /** The creator's end cards; left out when the video has none. */
  renderEndscreen?: (state: EndscreenRenderState) => React.ReactNode;
  endCardStartSeconds?: number;
  // Callbacks
  onAuthorClick?: () => void;
  onProgress?: (progressData: OnProgressData) => void;
  onEnd?: () => void;
  /**
   * False while something the player does not own, such as the end card
   * modal, has the remote. The player then leaves remote input alone.
   */
  remoteEnabled?: boolean;

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
      renderEndscreen,
      onProgress,
      onEnd,
      remoteEnabled = true,
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

    // End cards: they show up on their own at the end screen's start, stay
    // passive while the video plays, and only take the remote in browse mode.
    const [endscreenDismissed, setEndscreenDismissed] = useState(false);
    const [endscreenForced, setEndscreenForced] = useState(false);
    const [endscreenBrowsingState, setEndscreenBrowsing] = useState(false);
    const [playbackEnded, setPlaybackEnded] = useState(false);

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

      // if (typeof onLoad === 'function') {
      //   onLoad(data);
      // }
    }

    // Leaving the very end again, by seeking or replaying, brings the end
    // cards back for the next pass.
    const leaveEndedState = (time: number) => {
      if (playbackEnded && duration > 0 && time < duration - 1) {
        setPlaybackEnded(false);
      }
    };

    function _onProgress(data: OnProgressData) {
      // console.log("Progress: ", data);
      leaveEndedState(data.currentTime);
      if (!seeking) {
        setCurrentTime(data.currentTime);

        onProgress?.(data);

        // if (typeof onProgress === 'function') {
        //   onProgress(data);
        // }
      }
    }

    const _onSeek = (data: OnSeekData) => {
      // if (!seeking) {
      //   setControlTimeout();
      // }
      setCurrentTime(data.seekTime);
      leaveEndedState(data.seekTime);

      // if (typeof onSeek === "function") {
      //   onSeek(obj);
      // }
    };

    const _onEnd = () => {
      // The end screen after the video takes over from the end cards.
      setPlaybackEnded(true);
      setEndscreenBrowsing(false);
      setEndscreenForced(false);
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

    const hasEndscreen = renderEndscreen !== undefined;
    const endscreenShown =
      hasEndscreen &&
      isEndscreenShown({
        currentTime,
        startSeconds: props.endCardStartSeconds,
        ended: playbackEnded,
        dismissed: endscreenDismissed,
        forced: endscreenForced,
      });
    const endscreenBrowsing = endscreenShown && endscreenBrowsingState;

    useEffect(() => {
      if (showControls && !loading && !endscreenBrowsing) {
        animations.showControlAnimation();
        setControlTimeout();
        // typeof events.onShowControls === 'function' && events.onShowControls();
      } else {
        animations.hideControlAnimation();
        clearControlTimeout();
        // typeof events.onHideControls === 'function' && events.onHideControls();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showControls, loading, endscreenBrowsing]);

    useEffect(() => {
      // Seeking back before the end screen starts a fresh pass through it.
      const startSeconds = props.endCardStartSeconds;
      if (startSeconds !== undefined && currentTime < startSeconds) {
        setEndscreenDismissed(false);
      }
    }, [currentTime, props.endCardStartSeconds]);

    useEffect(() => {
      if (!endscreenShown) {
        setEndscreenBrowsing(false);
      }
    }, [endscreenShown]);

    const startBrowsingEndscreen = useCallback(() => {
      setShowControls(false);
      setEndscreenBrowsing(true);
    }, []);

    const stopBrowsingEndscreen = useCallback(() => {
      setEndscreenBrowsing(false);
      setEndscreenForced(false);
    }, []);

    const onEndscreenElementOpened = useCallback(() => {
      setEndscreenBrowsing(false);
      setEndscreenForced(false);
      setEndscreenDismissed(true);
    }, []);

    useEffect(() => {
      const sub = DeviceEventEmitter.addListener(PausePlayerEvent, () => {
        setPaused(true);
      });
      return () => sub.remove();
    }, []);

    const longButtonPressed = useRef<string>(undefined);

    // Settings, details and the playlist picker are transparent modals above
    // this screen. The player kept reacting to the remote behind them, so
    // browsing a menu revealed the controls or seeked the video underneath.
    const screenFocused = useIsFocused();
    const remoteActive = screenFocused && remoteEnabled;

    // Back leaves browse mode before it leaves the screen. On tvOS the menu
    // key reaches React Navigation through `BackHandler`, and the listener
    // added last runs first, so this one can consume the press.
    useEffect(() => {
      if (!endscreenBrowsing || !remoteActive) {
        return;
      }
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        stopBrowsingEndscreen();
        return true;
      });
      return () => sub.remove();
    }, [endscreenBrowsing, remoteActive, stopBrowsingEndscreen]);

    useTVRemoteEvent(event => {
      switch (event.eventType) {
        case "select":
        case "up":
        case "down":
        case "right":
        case "left":
          // The focus engine moves between the cards on its own.
          if (endscreenBrowsing) {
            return;
          }
          // With the controls hidden, Up has no other job, so it is the way
          // into the cards that the hint points at.
          if (
            event.eventType === "up" &&
            endscreenShown &&
            !showControls &&
            longButtonPressed.current === undefined
          ) {
            startBrowsingEndscreen();
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
          // A held arrow scrubs; reveal the controls so the preview is
          // visible. Scrubbing with hidden controls moved the video blind.
          if (event.eventKeyAction === 0) {
            longButtonPressed.current = event.eventType;
            if (!endscreenBrowsing) {
              setShowControls(true);
            }
          } else if (
            event.eventKeyAction === 1 &&
            event.eventType === longButtonPressed.current
          ) {
            longButtonPressed.current = undefined;
            setControlTimeout();
          }
          break;
        case "longUp":
          // Opens the cards on demand, even before their time.
          if (hasEndscreen && !playbackEnded) {
            setEndscreenForced(true);
            startBrowsingEndscreen();
          }
          break;
        case "longDown":
          // Hides the cards for the rest of this pass.
          stopBrowsingEndscreen();
          setEndscreenDismissed(true);
          break;
      }
    }, remoteActive);

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

    const seekVideo = useCallback(
      (seconds: number) => _videoRef.current?.seek(seconds),
      [],
    );

    const {scrubTime} = useTVSeekControl({
      seekerFocused: seekerFocus,
      active: remoteActive,
      duration,
      currentTime,
      seek: seekVideo,
      setPause: setPaused,
    });

    // While a held key scrubs, the bar and the timer preview the release
    // target; the video keeps playing until the seek is committed.
    const displayedTime = scrubTime ?? currentTime;
    const displayedSeekerPosition =
      scrubTime !== undefined
        ? getSeekerPositionForTime(scrubTime, duration, seekerWidth)
        : seekerPosition;

    const {clearControlTimeout, resetControlTimeout, setControlTimeout} =
      useControlTimeout({
        controlTimeout,
        controlTimeoutDelay: 4000,
        mounted: mounted.current,
        showControls,
        setShowControls,
        // The timer must not hide the preview of a scrub in progress.
        alwaysShowControls: scrubTime !== undefined,
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
          onPlaybackSizeChange={size =>
            setResolution(formatResolutionLabel(size))
          }
          onAudioTracks={tracks => {
            setLanguages(tracks.audioTracks);
          }}
          props={props.VideoComponentProps}
          // @ts-ignore
          ref={_videoRef}
        />
        {renderEndscreen ? (
          <EndCardContainer
            browsing={endscreenBrowsing}
            controlsVisible={showControls}
            visible={endscreenShown}>
            {renderEndscreen({
              currentTime,
              forced: endscreenForced,
              browsing: endscreenBrowsing,
              onElementOpened: onEndscreenElementOpened,
            })}
          </EndCardContainer>
        ) : null}
        <>
          {/* @ts-ignore Ignore missing props for the moment */}
          <BottomControls
            animations={animations}
            resetControlTimeout={resetControlTimeout}
            seekerFillWidth={
              scrubTime !== undefined
                ? displayedSeekerPosition
                : seekerFillWidth
            }
            setSeekerWidth={setSeekerWidth}
            setSeekerFocus={setSeekerFocus}
            seekerPosition={displayedSeekerPosition}
            panHandlers={seekPanResponder}
            showTimeRemaining={false}
            duration={duration}
            currentTime={displayedTime}
            showDuration
            bottomContainer={bottomContainer}
            metadata={props.metadata}
            resolution={resolution}
            showControls={showControls}
            setPaused={setPaused}
            onSeekbarPress={() => setPaused(paused => !paused)}
            restoreFocusOnHide={remoteActive && !endscreenBrowsing}
            onJumpToStart={() => _videoRef.current?.seek(0)}
          />
        </>
      </View>
    );
  },
);

export default VideoPlayer;
