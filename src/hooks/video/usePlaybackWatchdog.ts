import {useEffect, useMemo, useState} from "react";
import {AppState, AppStateStatus} from "react-native";
import type {ReactVideoEvents} from "react-native-video";

import {PlaybackWatchdog} from "@/utils/PlaybackWatchdog";

/** "inactive" (Control Center, incoming call) still shows the player. */
function isForeground(state: AppStateStatus) {
  return state !== "background";
}

export function usePlaybackWatchdog({
  sourceKey,
  paused,
  onFailure,
  onActive,
  onAdvance,
}: {
  sourceKey: string;
  paused?: boolean;
  onFailure?: (reason: string) => void;
  onActive?: (active: boolean) => void;
  onAdvance?: () => void;
}) {
  const [foreground, setForeground] = useState(
    isForeground(AppState.currentState),
  );
  useEffect(() => {
    const listener = AppState.addEventListener("change", state =>
      setForeground(isForeground(state)),
    );
    return () => listener.remove();
  }, []);

  const watchdog = useMemo(
    () => new PlaybackWatchdog({onFailure, onActive, onAdvance}),
    // Each source owns its callbacks, so late events cannot fail a newer attempt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sourceKey, onFailure, onActive, onAdvance],
  );
  useEffect(() => {
    watchdog.attach();
    return () => watchdog.dispose();
  }, [watchdog]);
  useEffect(() => {
    watchdog.setActive(!paused && foreground);
  }, [watchdog, paused, foreground]);
  useEffect(() => {
    if (!paused) watchdog.play();
  }, [watchdog, paused]);
  return watchdog;
}

type WatchdogVideoEvents = Pick<
  ReactVideoEvents,
  | "onProgress"
  | "onError"
  | "onSeek"
  | "onPlaybackStateChanged"
  | "onBuffer"
  | "onPlaybackRateChange"
  | "onEnd"
>;

/**
 * The `<Video>` events the watchdog needs, each followed by the player's own
 * handler. Every player spreads these, so no surface misses an event.
 */
export function withPlaybackWatchdog(
  watchdog: PlaybackWatchdog,
  handlers: WatchdogVideoEvents = {},
): Required<WatchdogVideoEvents> {
  return {
    onProgress: data => {
      watchdog.progress(data.currentTime);
      handlers.onProgress?.(data);
    },
    onError: error => {
      handlers.onError?.(error);
      watchdog.fail();
    },
    onSeek: data => {
      watchdog.seek();
      handlers.onSeek?.(data);
    },
    onPlaybackStateChanged: data => {
      if (data.isSeeking) watchdog.seek();
      handlers.onPlaybackStateChanged?.(data);
    },
    onBuffer: data => {
      watchdog.buffer(data.isBuffering);
      handlers.onBuffer?.(data);
    },
    // Native controls and the system (route changes, remote commands) can
    // pause the player without the paused prop changing.
    onPlaybackRateChange: data => {
      watchdog.rateChanged(data.playbackRate);
      handlers.onPlaybackRateChange?.(data);
    },
    onEnd: () => {
      watchdog.end();
      handlers.onEnd?.();
    },
  };
}
