import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {Platform} from "react-native";

import {
  clampSeekTime,
  createRemoteSeekInterpreter,
  getScrubStepSeconds,
  SeekDirection,
  SeekSource,
  TV_SCRUB_TICK_MS,
  TV_SEEK_CHAIN_WINDOW_MS,
  TV_SEEK_STEP_SECONDS,
} from "../tvRemoteSeek";

import {useTVRemoteEvent} from "@/ui/tv";

interface TVSeekControlProps {
  /** The seek bar has focus, so the arrow keys seek. */
  seekerFocused: boolean;
  /** The player owns the remote; false while a screen or modal covers it. */
  active: boolean;
  duration: number;
  currentTime: number;
  seek: (seconds: number) => void;
  setPause: Dispatch<SetStateAction<boolean>>;
}

interface Scrub {
  time: number;
  timer: ReturnType<typeof setInterval>;
}

/**
 * Remote seeking for the TV overlay.
 *
 * A tap jumps by a fixed step, a held key scrubs a preview position that is
 * only committed to the player on release. The preview is returned as
 * `scrubTime` so the seek bar and timer can show where the release will land.
 */
export default function useTVSeekControl({
  seekerFocused,
  active,
  duration,
  currentTime,
  seek,
  setPause,
}: TVSeekControlProps) {
  const [scrubTime, setScrubTime] = useState<number>();
  const [interpreter] = useState(() =>
    createRemoteSeekInterpreter(Platform.OS === "android" ? "android" : "ios"),
  );

  const scrubRef = useRef<Scrub>(undefined);
  const lastTargetRef = useRef<{time: number; at: number}>(undefined);

  // The scrub timer outlives the render that started it.
  const durationRef = useRef(duration);
  durationRef.current = duration;
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  const seekRef = useRef(seek);
  seekRef.current = seek;

  /** Where the next seek starts: a just-requested target, else the player. */
  const getSeekBase = useCallback(() => {
    const lastTarget = lastTargetRef.current;
    if (lastTarget && Date.now() - lastTarget.at < TV_SEEK_CHAIN_WINDOW_MS) {
      return lastTarget.time;
    }
    return currentTimeRef.current;
  }, []);

  const seekTo = useCallback((seconds: number) => {
    const target = clampSeekTime(seconds, durationRef.current);
    lastTargetRef.current = {time: target, at: Date.now()};
    seekRef.current(target);
  }, []);

  const stopScrub = useCallback(
    (commit: boolean) => {
      const scrub = scrubRef.current;
      if (!scrub) {
        return;
      }
      clearInterval(scrub.timer);
      scrubRef.current = undefined;
      if (commit) {
        seekTo(scrub.time);
      }
      setScrubTime(undefined);
    },
    [seekTo],
  );

  const startScrub = useCallback(
    (direction: SeekDirection) => {
      stopScrub(false);
      const startedAt = Date.now();
      const scrub: Scrub = {
        time: getSeekBase(),
        timer: setInterval(() => {
          const step = getScrubStepSeconds(
            durationRef.current,
            Date.now() - startedAt,
          );
          scrub.time = clampSeekTime(
            scrub.time + direction * step,
            durationRef.current,
          );
          setScrubTime(scrub.time);
        }, TV_SCRUB_TICK_MS),
      };
      scrubRef.current = scrub;
      setScrubTime(scrub.time);
    },
    [getSeekBase, stopScrub],
  );

  // Losing the seek bar or the remote mid-scrub lands where the preview was,
  // instead of leaving a timer running that nothing would stop.
  const canSeekWithDpad = seekerFocused && active;
  useEffect(() => {
    if (!canSeekWithDpad) {
      interpreter.reset();
      stopScrub(true);
    }
  }, [canSeekWithDpad, interpreter, stopScrub]);

  useEffect(() => () => stopScrub(false), [stopScrub]);

  const allowed = (source: SeekSource) =>
    source === "media" ? active : canSeekWithDpad;

  useTVRemoteEvent(event => {
    for (const intent of interpreter.interpret(event)) {
      switch (intent.type) {
        case "step":
          if (allowed(intent.source)) {
            seekTo(getSeekBase() + intent.direction * TV_SEEK_STEP_SECONDS);
          }
          break;
        case "scrubStart":
          if (allowed(intent.source)) {
            startScrub(intent.direction);
          }
          break;
        case "scrubEnd":
          stopScrub(true);
          break;
        case "togglePlay":
          active && setPause(paused => !paused);
          break;
        case "play":
          active && setPause(false);
          break;
        case "pause":
          active && setPause(true);
          break;
      }
    }
  });

  return {scrubTime, scrubbing: scrubTime !== undefined};
}
