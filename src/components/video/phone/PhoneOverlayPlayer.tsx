import {MaterialIcons} from "@expo/vector-icons";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  AccessibilityActionEvent,
  ActivityIndicator,
  Animated,
  DeviceEventEmitter,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {Gesture, GestureDetector} from "react-native-gesture-handler";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import type {OnLoadData, OnProgressData} from "react-native-video";

import PhoneSeekBar from "./PhoneSeekBar";
import {
  CONTROLS_HIDE_DELAY_MS,
  DOUBLE_TAP_SEEK_SECONDS,
  DOUBLE_TAP_WINDOW_MS,
  HOLD_PLAYBACK_RATE,
  SEEK_CHAIN_WINDOW_MS,
  SeekDirection,
  formatPlaybackTime,
  getChainSeekTarget,
  getFullscreenSwipe,
  getTapZone,
  initialTapState,
  interpretTap,
} from "./phoneOverlayGestures";

import VideoEndCard from "@/components/video/VideoEndCard";
import {findActiveChapterIndex} from "@/components/video/tv/chapterModel";
import SubtitleOverlay from "@/components/video/videoPlayer/SubtitleOverlay";
import {
  PausePlayerEvent,
  VideoComponentRefType,
  VideoComponentType,
  VideoPlayerRefs,
} from "@/components/video/videoPlayer/VideoPlayer";
import {useVideoPlayerSettings} from "@/components/video/videoPlayer/settings/VideoPlayerSettingsContext";
import {useAppData} from "@/context/AppDataContext";
import type {YTChapter, YTEndscreen} from "@/extraction/Types";
import type {YTStoryboard} from "@/extraction/storyboard";
import {useTranslation} from "@/localization";
import {useSponsorBlock} from "@/utils/SponsorBlockProvider";
import {pickSubtitleTrack, SubtitleTrackList} from "@/utils/Subtitles";

// The player is drawn over video frames, so its colors are YouTube's and do
// not follow the app theme.
const CONTROL_COLOR = "#FFFFFF";
const SCRIM_COLOR = "rgba(0, 0, 0, 0.45)";

/** Hold time before a press turns into the 2x playback of YouTube. */
const HOLD_MIN_DURATION_MS = 450;

interface PhoneOverlayPlayerProps<T> {
  VideoComponent: React.ComponentType<
    VideoComponentType<T> & React.RefAttributes<VideoComponentRefType>
  >;
  VideoComponentProps: T;
  /** Used by SponsorBlock. */
  videoID: string;
  /** Shown in the top bar while in full screen, as on YouTube. */
  title?: string;
  /** Caption tracks offered in the settings and behind the CC button. */
  subtitles?: SubtitleTrackList;
  /** Splits the seek bar and names the chapter under the finger. */
  chapters?: YTChapter[];
  /** Frames for the preview above the seek bar while scrubbing. */
  storyboard?: YTStoryboard;
  /** The creator's end cards, shown over the last seconds of the video. */
  endscreen?: YTEndscreen;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenSettings: () => void;
  /** The chevron in the top left; left out hides it. */
  onClose?: () => void;
  onProgress?: (data: OnProgressData) => void;
  onEnd?: () => void;
}

interface SeekIndicator {
  direction: SeekDirection;
  seconds: number;
  /** Changes on every tap so the ripple restarts. */
  id: number;
}

/**
 * The custom overlay of the phone and tablet player. It copies YouTube's
 * mobile player: tap toggles the controls, a double tap on either side jumps
 * ten seconds (every further tap adds ten), holding plays at 2x, and the red
 * bar at the bottom scrubs.
 *
 * The gesture surface and the controls are siblings, not parent and child:
 * a gesture recognizer on a parent would also see the taps meant for the
 * buttons and toggle the overlay on every button press.
 */
const PhoneOverlayPlayer = forwardRef<
  VideoPlayerRefs,
  PhoneOverlayPlayerProps<any>
>(
  (
    {
      VideoComponent,
      VideoComponentProps,
      videoID,
      title,
      subtitles,
      chapters,
      storyboard,
      endscreen,
      fullscreen,
      onToggleFullscreen,
      onOpenSettings,
      onClose,
      onProgress,
      onEnd,
    },
    ref,
  ) => {
    const {t} = useTranslation();
    const {appSettings} = useAppData();
    const insets = useSafeAreaInsets();
    const videoRef = useRef<VideoComponentRefType>(null);

    const [paused, setPaused] = useState(false);
    const [ended, setEnded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [buffering, setBuffering] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [bufferedTime, setBufferedTime] = useState(0);
    const [showControls, setShowControls] = useState(false);
    const [holding, setHolding] = useState(false);
    const [scrubTime, setScrubTime] = useState<number>();
    const [seekIndicator, setSeekIndicator] = useState<SeekIndicator>();
    const [surfaceWidth, setSurfaceWidth] = useState(0);
    // Bumped by every interaction with the controls to restart the hide timer.
    const [interaction, setInteraction] = useState(0);

    const tapState = useRef(initialTapState);
    const singleTapTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const indicatorTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const chainOrigin = useRef(0);
    const currentTimeRef = useRef(0);
    currentTimeRef.current = currentTime;

    const {
      speed,
      selectedLanguage,
      setLanguages,
      setSubtitles,
      selectedSubtitle,
      selectSubtitle,
    } = useVideoPlayerSettings();

    // The settings sheet reads the tracks from the shared player settings.
    useEffect(() => {
      setSubtitles(subtitles);
      return () => setSubtitles(undefined);
    }, [setSubtitles, subtitles]);

    useEffect(
      () => () => {
        clearTimeout(singleTapTimer.current);
        clearTimeout(indicatorTimer.current);
      },
      [],
    );

    const seek = useCallback((seconds: number) => {
      videoRef.current?.seek(seconds);
      setCurrentTime(seconds);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        pause: () => setPaused(true),
        seek,
        getCurrentPositionSeconds: async () =>
          (await videoRef.current?.getCurrentPositionSeconds()) ??
          currentTimeRef.current,
      }),
      [seek],
    );

    useSponsorBlock(videoID, currentTime, seek);

    // An end card that opens a channel pushes it above the still mounted
    // player, which has to stop then, as on TV.
    useEffect(() => {
      const sub = DeviceEventEmitter.addListener(PausePlayerEvent, () =>
        setPaused(true),
      );
      return () => sub.remove();
    }, []);

    // A fallback step swaps the source in place; it loads from scratch.
    const sourceUrl: string | undefined = VideoComponentProps?.url;
    useEffect(() => {
      setLoading(true);
      setEnded(false);
    }, [sourceUrl]);

    // YouTube keeps the controls up while paused and hides them during
    // playback once the user stops touching the player.
    useEffect(() => {
      if (!showControls || paused || ended || scrubTime !== undefined) {
        return;
      }
      const timer = setTimeout(
        () => setShowControls(false),
        CONTROLS_HIDE_DELAY_MS,
      );
      return () => clearTimeout(timer);
    }, [showControls, paused, ended, scrubTime, interaction]);

    const controlsOpacity = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      Animated.timing(controlsOpacity, {
        toValue: showControls ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
    }, [controlsOpacity, showControls]);

    const touch = useCallback(() => setInteraction(value => value + 1), []);

    const togglePlay = useCallback(() => {
      touch();
      if (ended) {
        setEnded(false);
        seek(0);
        setPaused(false);
        return;
      }
      setPaused(value => !value);
    }, [ended, seek, touch]);

    const runSeekChain = useCallback(
      (direction: SeekDirection, totalSeconds: number, started: boolean) => {
        if (started) {
          // Measured from the first tap: the reported position lags behind a
          // seek, so adding to it would lose taps in a fast chain.
          chainOrigin.current = currentTimeRef.current;
        }
        if (ended && direction === -1) {
          setEnded(false);
          setPaused(false);
        }
        seek(
          getChainSeekTarget(
            chainOrigin.current,
            direction,
            totalSeconds,
            duration,
          ),
        );
        setShowControls(false);
        setSeekIndicator(previous => ({
          direction,
          seconds: totalSeconds,
          id: (previous?.id ?? 0) + 1,
        }));
        clearTimeout(indicatorTimer.current);
        indicatorTimer.current = setTimeout(
          () => setSeekIndicator(undefined),
          SEEK_CHAIN_WINDOW_MS,
        );
      },
      [duration, ended, seek],
    );

    const handleTap = useCallback(
      (x: number) => {
        const {state, result} = interpretTap(tapState.current, {
          x,
          width: surfaceWidth,
          at: Date.now(),
        });
        tapState.current = state;
        clearTimeout(singleTapTimer.current);

        if (result.kind === "seek") {
          runSeekChain(result.direction, result.totalSeconds, result.started);
          return;
        }

        const toggle = () => {
          setShowControls(value => !value);
          touch();
        };
        // A tap in the middle can never become a seek, so it does not have
        // to wait for a possible second tap.
        if (getTapZone(x, surfaceWidth) === "center") {
          toggle();
        } else {
          singleTapTimer.current = setTimeout(toggle, DOUBLE_TAP_WINDOW_MS);
        }
      },
      [runSeekChain, surfaceWidth, touch],
    );

    const surfaceGesture = Gesture.Race(
      // Up enters full screen, down leaves it. The offsets keep the pan from
      // starting on a tap or a sideways movement.
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetY([-20, 20])
        .failOffsetX([-30, 30])
        .onEnd(event => {
          if (
            getFullscreenSwipe(event.translationY, event.velocityY, fullscreen)
          ) {
            onToggleFullscreen();
          }
        }),
      Gesture.LongPress()
        .runOnJS(true)
        .minDuration(HOLD_MIN_DURATION_MS)
        .onStart(() => {
          if (!paused && !ended) {
            setHolding(true);
            setShowControls(false);
          }
        })
        .onFinalize(() => setHolding(false)),
      Gesture.Tap()
        .runOnJS(true)
        .maxDuration(HOLD_MIN_DURATION_MS)
        .onEnd((event, success) => {
          if (success) {
            handleTap(event.x);
          }
        }),
    );

    const seekFromBar = (target: number) => {
      if (ended && target < duration - 1) {
        setEnded(false);
        setPaused(false);
      }
      seek(target);
      touch();
    };

    const onLoad = (data: OnLoadData) => {
      setDuration(data.duration);
      setLoading(false);
    };

    const onVideoProgress = (data: OnProgressData) => {
      if (ended && duration > 0 && data.currentTime < duration - 1) {
        setEnded(false);
      }
      setCurrentTime(data.currentTime);
      setBufferedTime(data.playableDuration);
      onProgress?.(data);
    };

    const onVideoEnd = () => {
      setEnded(true);
      setPaused(true);
      setShowControls(true);
      setCurrentTime(duration);
      onEnd?.();
    };

    const toggleSubtitles = () => {
      touch();
      if (selectedSubtitle) {
        selectSubtitle(undefined);
        return;
      }
      selectSubtitle(
        pickSubtitleTrack(subtitles, {
          enabled: true,
          languageCode: appSettings.subtitleLanguage,
        }),
      );
    };

    const onAccessibilityAction = (event: AccessibilityActionEvent) => {
      switch (event.nativeEvent.actionName) {
        case "activate":
          setShowControls(value => !value);
          touch();
          break;
        case "decrement":
          runSeekChain(-1, DOUBLE_TAP_SEEK_SECONDS, true);
          break;
        case "increment":
          runSeekChain(1, DOUBLE_TAP_SEEK_SECONDS, true);
          break;
      }
    };

    const displayedTime = scrubTime ?? currentTime;
    const chapterIndex = chapters?.length
      ? findActiveChapterIndex(chapters, displayedTime)
      : -1;
    const chapterTitle =
      chapterIndex >= 0 ? chapters?.[chapterIndex]?.title : undefined;
    // From the end screen's start to the end of the video. After the end the
    // cards stay, even those whose own window has already closed.
    const endscreenShown =
      endscreen !== undefined &&
      scrubTime === undefined &&
      (ended ||
        (endscreen.startDuration !== undefined &&
          currentTime >= endscreen.startDuration));
    const controlsActive = showControls || scrubTime !== undefined;
    const sideInsets = fullscreen
      ? {paddingLeft: insets.left, paddingRight: insets.right}
      : undefined;

    const playIcon = ended ? "replay" : paused ? "play-arrow" : "pause";
    const playLabel = ended
      ? t("video.player.replay")
      : paused
        ? t("video.player.play")
        : t("video.player.pause");

    return (
      <View style={styles.root}>
        <VideoComponent
          ref={videoRef}
          paused={paused}
          rate={holding ? HOLD_PLAYBACK_RATE : speed}
          audioTrackIndex={selectedLanguage?.index}
          onLoad={onLoad}
          onProgress={onVideoProgress}
          onSeek={data => setCurrentTime(data.seekTime)}
          onEnd={onVideoEnd}
          onError={() => setLoading(false)}
          onBuffer={setBuffering}
          onAudioTracks={tracks => setLanguages(tracks.audioTracks)}
          props={VideoComponentProps}
        />

        <SubtitleOverlay
          track={selectedSubtitle}
          currentTime={currentTime}
          raised={controlsActive}
        />

        <GestureDetector gesture={surfaceGesture}>
          <View
            accessible
            accessibilityActions={[
              {name: "activate"},
              {
                name: "decrement",
                label: t("video.player.seekBackward", {
                  seconds: DOUBLE_TAP_SEEK_SECONDS,
                }),
              },
              {
                name: "increment",
                label: t("video.player.seekForward", {
                  seconds: DOUBLE_TAP_SEEK_SECONDS,
                }),
              },
            ]}
            accessibilityLabel={title}
            onAccessibilityAction={onAccessibilityAction}
            onLayout={(event: LayoutChangeEvent) =>
              setSurfaceWidth(event.nativeEvent.layout.width)
            }
            style={StyleSheet.absoluteFill}
          />
        </GestureDetector>

        {endscreenShown ? (
          // Above the gesture surface so the cards take their own taps, below
          // the controls so the buttons stay reachable.
          <VideoEndCard
            browsing
            currentTime={currentTime}
            endcard={endscreen}
            ignoreTiming={ended}
            onElementOpened={() => setShowControls(false)}
          />
        ) : null}

        {seekIndicator ? (
          <SeekRipple
            key={seekIndicator.id}
            direction={seekIndicator.direction}
            label={t("video.player.seekSeconds", {
              seconds: seekIndicator.seconds,
            })}
          />
        ) : null}

        {holding ? (
          <View pointerEvents={"none"} style={styles.holdPill}>
            <Text style={styles.holdText}>
              {t("video.player.holdSpeed", {rate: HOLD_PLAYBACK_RATE})}
            </Text>
            <MaterialIcons
              color={CONTROL_COLOR}
              name={"fast-forward"}
              size={16}
            />
          </View>
        ) : null}

        <Animated.View
          pointerEvents={controlsActive ? "box-none" : "none"}
          style={[
            StyleSheet.absoluteFill,
            sideInsets,
            {opacity: controlsOpacity},
          ]}>
          <View pointerEvents={"none"} style={styles.scrim} />

          <View pointerEvents={"box-none"} style={styles.topBar}>
            {onClose && !fullscreen ? (
              <ControlButton
                icon={"keyboard-arrow-down"}
                label={t("video.player.close")}
                onPress={onClose}
                size={30}
              />
            ) : null}
            {fullscreen && title ? (
              <Text numberOfLines={1} style={styles.title}>
                {title}
              </Text>
            ) : (
              <View style={styles.spacer} />
            )}
            {subtitles?.tracks.length ? (
              <ControlButton
                icon={
                  selectedSubtitle ? "closed-caption" : "closed-caption-off"
                }
                label={t("video.player.subtitles")}
                onPress={toggleSubtitles}
                selected={selectedSubtitle !== undefined}
              />
            ) : null}
            <ControlButton
              icon={"settings"}
              label={t("video.player.settings")}
              onPress={() => {
                touch();
                onOpenSettings();
              }}
            />
          </View>

          <View pointerEvents={"box-none"} style={styles.center}>
            {loading || buffering ? null : (
              <Pressable
                accessibilityLabel={playLabel}
                accessibilityRole={"button"}
                hitSlop={12}
                onPress={togglePlay}
                style={styles.playButton}>
                <MaterialIcons
                  color={CONTROL_COLOR}
                  name={playIcon}
                  size={44}
                />
              </Pressable>
            )}
          </View>

          <View
            pointerEvents={"box-none"}
            style={[
              styles.bottomBar,
              fullscreen && styles.bottomBarFullscreen,
            ]}>
            <Text style={styles.time}>
              {formatPlaybackTime(displayedTime, duration)}
              <Text style={styles.duration}>
                {" / "}
                {formatPlaybackTime(duration)}
              </Text>
            </Text>
            {chapterTitle ? (
              <Text numberOfLines={1} style={styles.chapter}>
                {` • ${chapterTitle}`}
              </Text>
            ) : null}
            <View style={styles.spacer} />
            <ControlButton
              icon={fullscreen ? "fullscreen-exit" : "fullscreen"}
              label={
                fullscreen
                  ? t("video.player.fullscreen.exit")
                  : t("video.player.fullscreen.enter")
              }
              onPress={() => {
                touch();
                onToggleFullscreen();
              }}
              size={28}
            />
          </View>
        </Animated.View>

        {loading || buffering ? (
          <View pointerEvents={"none"} style={styles.center}>
            <ActivityIndicator color={CONTROL_COLOR} size={"large"} />
          </View>
        ) : null}

        {/*
         * The bar sits on the bottom edge outside the fading layer: with the
         * controls hidden, YouTube keeps a thin progress line visible, and
         * the bar keeps its own touch area so it can be grabbed any time.
         */}
        <PhoneSeekBar
          active={controlsActive}
          bufferedTime={bufferedTime}
          chapters={chapters}
          currentTime={currentTime}
          duration={duration}
          fullscreen={fullscreen}
          insetLeft={insets.left}
          insetRight={insets.right}
          onScrub={setScrubTime}
          onSeek={seekFromBar}
          scrubTime={scrubTime}
          storyboard={storyboard}
        />
      </View>
    );
  },
);

export default PhoneOverlayPlayer;

interface ControlButtonProps {
  icon: React.ComponentProps<typeof MaterialIcons>["name"];
  label: string;
  onPress: () => void;
  size?: number;
  selected?: boolean;
}

function ControlButton({
  icon,
  label,
  onPress,
  size = 24,
  selected,
}: ControlButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole={"button"}
      accessibilityState={selected !== undefined ? {selected} : undefined}
      hitSlop={8}
      onPress={onPress}
      style={styles.controlButton}>
      <MaterialIcons color={CONTROL_COLOR} name={icon} size={size} />
    </Pressable>
  );
}

/**
 * The ripple of a double tap seek: a rounded shade over the tapped side with
 * the arrows and the total jump, as YouTube draws it.
 */
function SeekRipple({
  direction,
  label,
}: {
  direction: SeekDirection;
  label: string;
}) {
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  const forward = direction === 1;

  return (
    <Animated.View
      pointerEvents={"none"}
      style={[
        styles.ripple,
        forward ? styles.rippleRight : styles.rippleLeft,
        {opacity},
      ]}>
      <MaterialIcons
        color={CONTROL_COLOR}
        name={forward ? "fast-forward" : "fast-rewind"}
        size={28}
      />
      <Text style={styles.rippleText}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "black",
    overflow: "hidden",
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: SCRIM_COLOR,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 6,
    gap: 4,
  },
  title: {
    flex: 1,
    color: CONTROL_COLOR,
    fontSize: 16,
    fontWeight: "600",
    paddingHorizontal: 8,
  },
  spacer: {
    flex: 1,
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 14,
    paddingRight: 6,
  },
  bottomBarFullscreen: {
    bottom: 34,
    paddingLeft: 16,
    paddingRight: 8,
  },
  time: {
    color: CONTROL_COLOR,
    fontSize: 13,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
  },
  duration: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  chapter: {
    flexShrink: 1,
    color: CONTROL_COLOR,
    fontSize: 13,
    fontWeight: "500",
  },
  controlButton: {
    padding: 8,
  },
  holdPill: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  holdText: {
    color: CONTROL_COLOR,
    fontSize: 13,
    fontWeight: "600",
  },
  ripple: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "40%",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
  },
  rippleLeft: {
    left: 0,
    borderTopRightRadius: 1000,
    borderBottomRightRadius: 1000,
  },
  rippleRight: {
    right: 0,
    borderTopLeftRadius: 1000,
    borderBottomLeftRadius: 1000,
  },
  rippleText: {
    color: CONTROL_COLOR,
    fontSize: 13,
    fontWeight: "600",
  },
});
