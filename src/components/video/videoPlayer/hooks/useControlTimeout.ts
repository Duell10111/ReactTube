import {
  Dispatch,
  MutableRefObject,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

interface ControlTimeoutProps {
  controlTimeout: MutableRefObject<ReturnType<typeof setTimeout>>;
  controlTimeoutDelay: number;
  mounted: boolean;
  showControls: boolean;
  setShowControls: Dispatch<SetStateAction<boolean>>;
  alwaysShowControls: boolean;
}

/**
 * Timer that hides the player controls again.
 *
 * One effect owns the timer. That matters because every caller restarts the
 * timer as a pair — `resetControlTimeout()` followed by `setControlTimeout()`
 * — and both landed in the same render before. Two effects then ran in order
 * in that one commit: the first armed a fresh timer, the second cleared it and
 * did not arm another. After the first remote press the controls therefore
 * stayed on screen for the rest of the video.
 *
 * Arming and clearing are now one piece of state, so the last call in a batch
 * decides, and a restart cannot cancel itself.
 */
export const useControlTimeout = ({
  controlTimeout,
  controlTimeoutDelay,
  mounted,
  showControls,
  setShowControls,
  alwaysShowControls,
}: ControlTimeoutProps) => {
  const [armed, setArmed] = useState(true);
  /** Bumped to restart a running timer without changing whether it is armed. */
  const [restart, setRestart] = useState(0);

  const hideControls = useCallback(() => {
    if (mounted && showControls && !alwaysShowControls) {
      setShowControls(false);
    }
  }, [alwaysShowControls, mounted, setShowControls, showControls]);

  /**
   * The timer fires seconds after it was armed, so it reads the current hide
   * through a ref. Armed with the closure of its own render, it would test a
   * `showControls` that was already stale when it fired.
   */
  const hideControlsRef = useRef(hideControls);
  hideControlsRef.current = hideControls;

  const setControlTimeout = useCallback(() => {
    setArmed(true);
    setRestart(previous => previous + 1);
  }, []);

  const clearControlTimeout = useCallback(() => setArmed(false), []);

  const resetControlTimeout = useCallback(
    () => setRestart(previous => previous + 1),
    [],
  );

  useEffect(() => {
    if (!armed) {
      return;
    }

    const timeout = setTimeout(
      () => hideControlsRef.current(),
      controlTimeoutDelay,
    );
    controlTimeout.current = timeout;

    return () => clearTimeout(timeout);
  }, [armed, controlTimeout, controlTimeoutDelay, restart]);

  return {
    clearControlTimeout,
    resetControlTimeout,
    hideControls,
    setControlTimeout,
  };
};
