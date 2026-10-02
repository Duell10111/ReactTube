import {useCallback, useEffect, useRef, useState} from "react";

import {
  getCountdownState,
  type CountdownState,
} from "@/components/video/endcard/endscreenModel";

/** Often enough for a smooth progress bar, rare enough to stay cheap. */
const TICK_MS = 250;

interface AutoplayCountdownOptions {
  totalSeconds: number;
  /** The countdown waits until there is something to play. */
  enabled: boolean;
  onElapsed: () => void;
}

/**
 * Countdown before the next video starts. It runs from a start timestamp
 * instead of counting ticks, so a late timer never stretches it, and it fires
 * `onElapsed` exactly once. A cancelled countdown stays cancelled.
 */
export function useAutoplayCountdown({
  totalSeconds,
  enabled,
  onElapsed,
}: AutoplayCountdownOptions) {
  const [cancelled, setCancelled] = useState(false);
  const [state, setState] = useState<CountdownState>(() =>
    getCountdownState(0, totalSeconds),
  );
  const onElapsedRef = useRef(onElapsed);
  onElapsedRef.current = onElapsed;

  const running = enabled && !cancelled && !state.elapsed;

  useEffect(() => {
    if (!enabled || cancelled) {
      return;
    }

    const startedAt = Date.now();
    const interval = setInterval(() => {
      const next = getCountdownState(Date.now() - startedAt, totalSeconds);
      setState(next);
      if (next.elapsed) {
        clearInterval(interval);
        onElapsedRef.current();
      }
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [cancelled, enabled, totalSeconds]);

  const cancel = useCallback(() => setCancelled(true), []);

  return {
    remainingSeconds: state.remainingSeconds,
    progress: state.progress,
    running,
    cancelled,
    cancel,
  };
}
