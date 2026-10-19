export type AutomaticPlaybackType =
  | "hls"
  | "hlsLocal"
  | "hlsLocalAv1"
  | "sabr"
  | "http";

export interface PlaybackCapabilities {
  generatedHls: boolean;
  av1: boolean;
  sabr: boolean;
}

export function automaticPlaybackOrder(capabilities: PlaybackCapabilities) {
  return [
    "hls",
    ...(capabilities.generatedHls ? ["hlsLocal"] : []),
    ...(capabilities.generatedHls && capabilities.av1 ? ["hlsLocalAv1"] : []),
    ...(capabilities.sabr ? ["sabr"] : []),
    "http",
  ] as AutomaticPlaybackType[];
}

export const PLAYBACK_PREPARATION_TIMEOUT_MS = 20_000;
export const PLAYBACK_RECOVERY_BUDGET_MS = 120_000;

/** A known access restriction cannot be fixed by changing the delivery type. */
export class PlaybackAccessError extends Error {}

export interface PreparedPlayback {
  uri: string;
  dispose?: () => void | Promise<void>;
}

export type AutomaticPlaybackPhase =
  | "idle"
  | "preparing"
  | "starting"
  | "playing"
  | "failed"
  | "disposed";

export interface AutomaticPlaybackState<T extends PreparedPlayback> {
  phase: AutomaticPlaybackPhase;
  attemptId: number;
  index: number;
  type?: AutomaticPlaybackType;
  source?: T;
  reason?: "preparation" | "player" | "timeout" | "budget" | "access";
}

export interface PlaybackClock {
  now: () => number;
  setTimer: (
    callback: () => void,
    milliseconds: number,
  ) => ReturnType<typeof setTimeout>;
  clearTimer: (timer: ReturnType<typeof setTimeout>) => void;
}

const systemClock: PlaybackClock = {
  now: Date.now,
  setTimer: (callback, milliseconds) => setTimeout(callback, milliseconds),
  clearTimer: timer => clearTimeout(timer),
};

interface AutomaticPlaybackOptions<T extends PreparedPlayback> {
  order: AutomaticPlaybackType[];
  prepare: (
    type: AutomaticPlaybackType,
    signal: AbortSignal,
  ) => Promise<T | undefined>;
  onChange: (state: AutomaticPlaybackState<T>) => void;
  clock?: PlaybackClock;
  preparationTimeoutMs?: number;
  budgetMs?: number;
}

/** Owns one video's attempts; every event must carry the attempt it belongs to. */
export class AutomaticPlaybackSession<T extends PreparedPlayback> {
  state: AutomaticPlaybackState<T> = {phase: "idle", attemptId: 0, index: -1};
  private readonly clock: PlaybackClock;
  private abort?: AbortController;
  private preparationTimer?: ReturnType<typeof setTimeout>;
  private budgetTimer?: ReturnType<typeof setTimeout>;
  private budgetStartedAt?: number;
  private remainingMs: number;
  private active = false;
  private readonly seen = new Set<string>();
  private readonly options: AutomaticPlaybackOptions<T>;

  constructor(options: AutomaticPlaybackOptions<T>) {
    this.options = options;
    this.clock = options.clock ?? systemClock;
    this.remainingMs = options.budgetMs ?? PLAYBACK_RECOVERY_BUDGET_MS;
  }

  start() {
    if (this.state.phase === "idle") {
      this.next();
    }
  }

  private publish(next: AutomaticPlaybackState<T>) {
    this.state = next;
    this.options.onChange(next);
  }

  private release(source: T | undefined) {
    // Cleanup must not block the next attempt, even when a backend never settles.
    try {
      Promise.resolve(source?.dispose?.()).catch(() => {});
    } catch {
      // A broken cleanup must not strand the chain.
    }
  }

  private clearPreparationTimer() {
    if (this.preparationTimer !== undefined) {
      this.clock.clearTimer(this.preparationTimer);
      this.preparationTimer = undefined;
    }
  }

  private pauseBudget() {
    if (this.budgetTimer !== undefined) {
      this.clock.clearTimer(this.budgetTimer);
      this.budgetTimer = undefined;
    }
    if (this.budgetStartedAt !== undefined) {
      this.remainingMs -= this.clock.now() - this.budgetStartedAt;
      this.budgetStartedAt = undefined;
    }
  }

  private armBudget() {
    this.pauseBudget();
    if (this.remainingMs <= 0) {
      this.finish("budget");
      return false;
    }
    this.budgetStartedAt = this.clock.now();
    this.budgetTimer = this.clock.setTimer(
      () => this.finish("budget"),
      this.remainingMs,
    );
    return true;
  }

  private finish(reason: AutomaticPlaybackState<T>["reason"]) {
    if (this.state.phase === "failed" || this.state.phase === "disposed") {
      return;
    }
    this.pauseBudget();
    this.clearPreparationTimer();
    this.abort?.abort();
    this.release(this.state.source);
    this.publish({...this.state, source: undefined, phase: "failed", reason});
  }

  private next(reason?: AutomaticPlaybackState<T>["reason"]) {
    if (this.state.index + 1 >= this.options.order.length) {
      this.finish(reason);
      return;
    }
    this.pauseBudget();
    this.clearPreparationTimer();
    this.abort?.abort();
    this.release(this.state.source);
    const index = this.state.index + 1;
    const type = this.options.order[index];
    const attemptId = this.state.attemptId + 1;
    this.active = false;
    this.publish({phase: "preparing", index, type, attemptId, reason});
    if (!this.armBudget()) {
      return;
    }
    const abort = new AbortController();
    this.abort = abort;
    this.preparationTimer = this.clock.setTimer(() => {
      if (this.isCurrent(attemptId, "preparing")) {
        this.next("timeout");
      }
    }, this.options.preparationTimeoutMs ?? PLAYBACK_PREPARATION_TIMEOUT_MS);
    // A synchronous adapter error is handled just like an async preparation error.
    Promise.resolve()
      .then(() =>
        abort.signal.aborted
          ? undefined
          : this.options.prepare(type, abort.signal),
      )
      .then(source => {
        if (!this.isCurrent(attemptId, "preparing")) {
          this.release(source);
          return;
        }
        this.clearPreparationTimer();
        this.pauseBudget();
        const identity = source
          ? `${type === "hlsLocalAv1" ? "av1:" : ""}${source.uri}`
          : undefined;
        if (!source || !source.uri || (identity && this.seen.has(identity))) {
          this.release(source);
          this.next("preparation");
          return;
        }
        this.seen.add(identity!);
        this.publish({phase: "starting", attemptId, index, type, source});
        // The player arms the budget once it is mounted and allowed to play.
      })
      .catch(error => {
        if (this.isCurrent(attemptId, "preparing")) {
          if (error instanceof PlaybackAccessError) {
            this.finish("access");
          } else {
            this.next("preparation");
          }
        }
      });
  }

  private isCurrent(attemptId: number, phase?: AutomaticPlaybackPhase) {
    return (
      this.state.attemptId === attemptId &&
      this.state.phase !== "failed" &&
      this.state.phase !== "disposed" &&
      (!phase || this.state.phase === phase)
    );
  }

  setActive(attemptId: number, active: boolean) {
    if (
      !this.isCurrent(attemptId) ||
      !this.state.source ||
      this.active === active
    ) {
      return;
    }
    this.active = active;
    if (this.state.phase === "starting") {
      if (active) {
        this.armBudget();
      } else {
        this.pauseBudget();
      }
    }
  }

  progress(attemptId: number) {
    if (!this.isCurrent(attemptId, "starting")) {
      return;
    }
    this.pauseBudget();
    this.remainingMs = this.options.budgetMs ?? PLAYBACK_RECOVERY_BUDGET_MS;
    this.publish({...this.state, phase: "playing"});
  }

  fail(attemptId: number) {
    if (!this.isCurrent(attemptId) || !this.state.source) {
      return;
    }
    this.next("player");
  }

  dispose() {
    if (this.state.phase === "disposed") {
      return;
    }
    this.pauseBudget();
    this.clearPreparationTimer();
    this.abort?.abort();
    this.release(this.state.source);
    this.state = {...this.state, source: undefined, phase: "disposed"};
  }
}
