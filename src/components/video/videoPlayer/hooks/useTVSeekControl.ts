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
  const [pressStartTime, setPressStartTime] = useState(null);

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

  const handleLongPress = (pos: number) => {
    if (!longPressInterval.current) {
      seekerPos.current = seekerPosition;
      // @ts-ignore TODO: fix
      setPressStartTime(new Date().getTime());
      setInterval(() => {
        // @ts-ignore TODO: fix
        const pressDuration = new Date().getTime() - pressStartTime;
        let speedFactor = 1;
        if (pressDuration > 2000) {
          // Länger als 2 Sekunden
          speedFactor = 5;
        } else if (pressDuration > 1000) {
          // Länger als 1 Sekunde
          speedFactor = 3;
        }
        const skipForward = seekerWidth * 0.05;
        setSeeking(true);
        // @ts-ignore TODO: fix
        const newPosition = seekerPos.current + pos * skipForward;
        console.log("New Position: ", newPosition);
        seekerPos.current = newPosition;
        setSeekerPosition(newPosition);
      }, 1000);
    } else {
      // @ts-ignore
      clearInterval(longPressInterval.current);
      const percent = seekerPosition / seekerWidth;
      const time = duration * percent;
      seek?.(time);
      setSeeking(false);
    }
  };

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
    // TODO: Add fast forward seek?
    // if (event.eventType === "longRight" || event.eventType === "longLeft") {
    //   handleLongPress(event.eventType === "longLeft" ? -1 : 1);
    // }
    // Check if
  });
}
