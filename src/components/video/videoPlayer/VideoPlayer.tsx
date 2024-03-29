import React, {
  ComponentPropsWithoutRef,
  ComponentPropsWithRef,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {View} from "react-native";
import Animated from "react-native-reanimated";
import Video, {
  OnLoadData,
  OnPlaybackData,
  OnProgressData,
  OnSeekData,
  OnVideoErrorData,
  VideoRef,
} from "react-native-video";

import BottomControls from "./BottomControls";
import {useControlTimeout} from "./hooks/useControlTimeout";
import {usePanResponders} from "./usePanResponders";

// TODO: Use own types
export interface VideoComponentType<T> {
  paused: boolean;
  // Events
  onLoad: (loadData: OnLoadData) => void;
  onSeek: (seekData: OnSeekData) => void;
  onProgress: (progressData: OnProgressData) => void;
  onError: (errorData: OnVideoErrorData) => void;
  onEnd: () => void;
  // Additional props
  props: T;
}

interface VideoPlayerRefs {}

interface VideoPlayerProps<T> {
  VideoComponent: typeof React.Component<VideoComponentType<T>>;
  VideoComponentProps: T;
}

const VideoPlayer = forwardRef<VideoPlayerRefs, VideoPlayerProps<any>>(
  ({VideoComponent, ...props}, ref) => {
    const mounted = useRef(false);
    const _videoRef = useRef<VideoRef>(null);
    const controlTimeout = useRef<ReturnType<typeof setTimeout>>(
      setTimeout(() => {}),
    ).current;

    // const [_resizeMode, setResizeMode] = useState<ResizeMode>(resizeMode);
    const [_paused, setPaused] = useState<boolean>(false);
    const [_muted, setMuted] = useState<boolean>(false);

    const [seekerPosition, setSeekerPositionState] = useState(0);
    const [seekerFillWidth, setSeekerFillWidth] = useState<number>(0);
    const [seekerOffset, setSeekerOffset] = useState(0);
    const [seekerWidth, setSeekerWidth] = useState(0);
    const [seeking, setSeeking] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);

    const [showControls, setShowControls] = useState(true);

    const [loading, setLoading] = useState(true);
    const [duration, setDuration] = useState(0);

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

    function _onProgress(data: OnProgressData) {
      console.log("Progress: ", data);
      if (!seeking) {
        setCurrentTime(data.currentTime);

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
      //
      // if (typeof onEnd === "function") {
      //   onEnd();
      // }
    };

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
        controlTimeoutDelay: 2000,
        mounted: mounted.current,
        showControls,
        setShowControls,
        alwaysShowControls: false,
      });

    const {seekPanResponder} = usePanResponders({
      duration,
      seekerOffset,
      loading: false,
      seekerWidth,
      seeking,
      seekerPosition,
      seek: _videoRef?.current?.seek, // TODO: Adapt
      clearControlTimeout,
      setSeekerPosition,
      setSeeking,
      // setControlTimeout,
      onEnd: () => {}, // TODO: Adapt
      horizontal: false, // TODO: Adapt
      inverted: false, // TODO: Adapt
    });

    console.log("CurrTime: ", currentTime);
    console.log("Duration: ", duration);
    console.log("Seeker Position: ", seekerPosition);
    console.log("Seeker Width: ", seekerWidth);

    useEffect(() => {
      if (!seeking && currentTime && duration) {
        const percent = currentTime / duration;
        const position = seekerWidth * percent;

        setSeekerPosition(position);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentTime, duration, seekerWidth, setSeekerPosition]);

    return (
      // TODO: Adapt style?
      <View style={{flex: 1}}>
        <VideoComponent
          onLoad={_onLoad}
          onProgress={_onProgress}
          paused={false}
          onEnd={_onEnd}
          onSeek={_onSeek}
          props={props.VideoComponentProps}
        />
        <>
          <BottomControls
            resetControlTimeout={resetControlTimeout}
            seekerFillWidth={seekerFillWidth}
            setSeekerWidth={setSeekerWidth}
            seekerPosition={seekerPosition}
            panHandlers={seekPanResponder}
            showTimeRemaining
            duration={duration}
            currentTime={currentTime}
            showDuration
          />
        </>
      </View>
    );
  },
);

export default VideoPlayer;
