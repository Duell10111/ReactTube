import type {PlaybackClock} from "./AutomaticPlayback.ts";

export const PLAYBACK_PROGRESS_TIMEOUT_MS = 20_000;
/**
 * A rebuffer after playback has advanced gets more time than the initial load:
 * slow connections stall that long after a seek or bitrate switch, while a dead
 * source (for example expired segment URLs) is still caught eventually.
 */
export const PLAYBACK_REBUFFER_TIMEOUT_MS = 60_000;

interface PlaybackWatchdogOptions {
  onFailure?: (reason: string) => void;
  onActive?: (active: boolean) => void;
  onAdvance?: () => void;
  timeoutMs?: number;
  rebufferTimeoutMs?: number;
  clock?: PlaybackClock;
}

/** Detects missing progress, including players that load successfully but never play. */
export class PlaybackWatchdog {
  private timer?: ReturnType<typeof setTimeout>;
  private armedAt?: number;
  private previousSeconds?: number;
  private requestedActive = false;
  private active = false;
  private nativePaused = false;
  private buffering = false;
  private ended = false;
  private stopped = false;
  private advanced = false;
  /** The player reported a positive rate, so a later rate of 0 is a real pause. */
  private playing = false;
  private readonly clock: PlaybackClock;
  private readonly options: PlaybackWatchdogOptions;

  constructor(options: PlaybackWatchdogOptions) {
    this.options = options;
    this.clock = options.clock ?? {
      now: Date.now,
      setTimer: (callback, delay) => setTimeout(callback, delay),
      clearTimer: timer => clearTimeout(timer),
    };
  }

  private clear() {
    if (this.timer !== undefined) this.clock.clearTimer(this.timer);
    this.timer = undefined;
  }

  /**
   * @param keepStart keeps the time already spent waiting, so that buffering
   * state changes switch the budget without granting a fresh one.
   */
  private arm(keepStart = false) {
    this.clear();
    if (!keepStart || this.armedAt === undefined)
      this.armedAt = this.clock.now();
    if (this.active && !this.stopped) {
      const budget =
        this.advanced && this.buffering
          ? (this.options.rebufferTimeoutMs ?? PLAYBACK_REBUFFER_TIMEOUT_MS)
          : (this.options.timeoutMs ?? PLAYBACK_PROGRESS_TIMEOUT_MS);
      this.timer = this.clock.setTimer(
        () =>
          this.fail(
            this.advanced ? "Playback stalled" : "Playback did not start",
          ),
        Math.max(0, budget - (this.clock.now() - this.armedAt)),
      );
    }
  }

  private updateActive() {
    const active =
      this.requestedActive &&
      !this.nativePaused &&
      !this.ended &&
      !this.stopped;
    if (active === this.active) return;
    this.active = active;
    this.options.onActive?.(active);
    this.arm();
  }

  setActive(active: boolean) {
    this.requestedActive = active;
    this.updateActive();
  }

  /** The app asked the player to play, which supersedes an earlier native pause. */
  play() {
    if (!this.nativePaused) return;
    this.nativePaused = false;
    this.updateActive();
  }

  attach() {
    this.stopped = false;
    this.updateActive();
  }

  progress(seconds: number) {
    if (this.stopped || !Number.isFinite(seconds)) return;
    if (this.ended) {
      // Late progress at the end is common; only a loop or seek restarts it.
      if (
        this.previousSeconds === undefined ||
        seconds >= this.previousSeconds - 0.1
      )
        return;
      this.ended = false;
      this.previousSeconds = undefined;
      this.updateActive();
    }
    if (
      this.previousSeconds !== undefined &&
      seconds > this.previousSeconds + 0.01
    ) {
      this.advanced = true;
      this.nativePaused = false;
      this.updateActive();
      this.arm();
      if (this.active) this.options.onAdvance?.();
    }
    this.previousSeconds = seconds;
  }

  seek() {
    if (this.stopped) return;
    this.previousSeconds = undefined;
    this.ended = false;
    this.updateActive();
    this.arm();
  }

  buffer(buffering: boolean) {
    if (buffering === this.buffering) return;
    this.buffering = buffering;
    if (buffering) this.nativePaused = false;
    this.updateActive();
    // Only a rebuffer changes the budget; the initial load keeps its deadline.
    // Entering a rebuffer extends the running budget; leaving it means the
    // player expects to continue, so it gets the normal budget from now.
    if (this.advanced) this.arm(buffering);
  }

  /**
   * Native controls and the system (route changes, remote commands) can pause
   * the player without the `paused` prop changing. A rate of 0 before the
   * player ever played or while it buffers is not a pause.
   */
  rateChanged(rate: number) {
    if (rate > 0) this.playing = true;
    if (rate > 0 || ((this.advanced || this.playing) && !this.buffering)) {
      this.nativePaused = rate === 0;
      this.updateActive();
    }
  }

  end() {
    this.ended = true;
    this.updateActive();
  }

  fail(reason = "Player error") {
    if (this.stopped) return;
    this.stopped = true;
    this.updateActive();
    this.clear();
    this.options.onFailure?.(reason);
  }

  dispose() {
    this.stopped = true;
    this.updateActive();
    this.clear();
  }
}
