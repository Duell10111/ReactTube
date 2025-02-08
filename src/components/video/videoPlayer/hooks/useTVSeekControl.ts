import {Dispatch, SetStateAction, useEffect, useRef, useState} from "react";
import {useTVEventHandler} from "react-native";

interface TVSeekControlProps {
  enabled: boolean;
  duration: number;
  currentTime: number;
  seeking: boolean;
  seekerPosition: number;
  seek?: (time: number, tolerance?: number) => void;
  seekerWidth: number;
  clearControlTimeout: () => void;
  setSeekerPosition: (position: number) => void;
  setSeeking: Dispatch<SetStateAction<boolean>>;
  pause: boolean;
  setPause: Dispatch<SetStateAction<boolean>>;
}

export default function useTVSeekControl({
  seek,
  seeking,
  setSeeking,
  duration,
  currentTime,
  seekerPosition,
  seekerWidth,
  setSeekerPosition,
  pause,
  setPause,
  enabled,
}: TVSeekControlProps) {
  const longPressInterval = useRef<NodeJS.Timer>();
  const seekerPos = useRef<number>();
  const pressStartTime = useRef<number>();

  useEffect(() => {
    return () => {
      console.log("Deinit useTVSeekControl");
      // @ts-ignore
      clearInterval(longPressInterval.current);
    };
  }, []);

  const calculateSeekerPosition = (seconds: number) => {
    const percent = seconds / duration;
    const position = seekerWidth * percent;
    return position;
  };

  const setSeekerPositionSeconds = (seconds: number) => {
    console.log("Set Seeker position for " + seconds);
    const position = calculateSeekerPosition(seconds);
    console.log(
      "Set Seeker position for " + seconds + " position: " + position,
    );
    // seek?.(seconds);
    setSeekerPosition(position);
  };

  // console.log("Seeker position", seekerPosition);
  // console.log("Seeker width", seekerWidth);

  const handleLongPress = (offset: number, start: boolean) => {
    // TODO: Implement with setTimeout with dynamically changing interval
    if (start) {
      seekerPos.current = seekerPosition;
      pressStartTime.current = new Date().getTime();
      longPressInterval.current = setInterval(
        () => longPressIntervalFkt(offset),
        500,
      );
    } else {
      // @ts-ignore
      clearInterval(longPressInterval.current);
      const percent = seekerPosition / seekerWidth;
      console.log(
        `Seeker percent ${percent} - ${seekerPosition}/${seekerWidth}`,
      );
      const time = duration * percent;
      console.log(`Seeking to time ${time}`);
      seek?.(time);
      setSeeking(false);
    }
  };

  function longPressIntervalFkt(offset: number) {
    const pressDuration = new Date().getTime() - (pressStartTime.current ?? 0);
    // Not needed as the progress in seekbar based and not time based?
    // if (pressDuration > 2000) {
    //   // @ts-ignore
    //   clearInterval(longPressInterval.current);
    //   longPressInterval.current = setInterval(
    //     () => longPressIntervalFkt(offset),
    //     200,
    //   );
    // }
    const skipForward = seekerWidth * 0.05;
    setSeeking(true);
    const newPosition =
      (seekerPos.current ?? seekerPosition) + offset * skipForward;
    console.log("New Position: ", newPosition);
    seekerPos.current = newPosition;
    setSeekerPosition(newPosition);
  }

  useTVEventHandler(event => {
    if (event.eventType === "playPause") {
      setPause(!pause);
    }
    if (!enabled) {
      // @ts-ignore
      longPressInterval.current && clearInterval(longPressInterval.current);
      return;
    }
    if (event.eventType === "right" || event.eventType === "left") {
      const pos = event.eventType === "left" ? -1 : 1;
      seek?.(currentTime + pos * 15);
      // setSeekerPositionSeconds(currentTime + pos * 15);
    }
    if (event.eventType === "longRight" || event.eventType === "longLeft") {
      handleLongPress(
        event.eventType === "longLeft" ? -1 : 1,
        event.eventKeyAction === 0,
      );
    }
    // Check if
  });
}
