/**
 * Content-bound PoToken minting with caching (plan phase 5.2).
 *
 * Platform-neutral: the BotGuard runtime is injected as a {@link PoTokenHost},
 * so the cache, expiry and cooldown rules are testable without a WebView.
 *
 * Only content tokens (bound to the video id) are minted. Measured on
 * 2026-10-04 they are what `WEB` needs — in the `/player` request and in the
 * SABR `StreamerContext`. Session tokens (bound to `visitorData`) changed
 * nothing anywhere, and the persisted session `visitorData` does not have to
 * match the homepage the challenge came from.
 */

/** A running BotGuard instance that can mint tokens. */
export interface PoTokenHost {
  /**
   * Fetches a fresh challenge, runs BotGuard and unlocks the minter.
   * Resolves with the integrity token's lifetime in seconds.
   */
  initialize(): Promise<{ttlSeconds: number}>;
  /** Mints a websafe-base64 token bound to `identifier`. */
  mint(identifier: string): Promise<string>;
}

export interface PoTokenMinterOptions {
  now?: () => number;
  /** Safety margin before the integrity token's expiry, in ms. */
  expiryMarginMs?: number;
  /** Pause after a failed initialization before trying again, in ms. */
  failureCooldownMs?: number;
  /** Upper bound for one initialization or one mint call, in ms. */
  timeoutMs?: number;
  /** Number of video ids whose tokens are kept. */
  cacheSize?: number;
  onLog?: (message: string) => void;
}

/** Clients whose playback measurably improves with a web PoToken. */
export const PO_TOKEN_CLIENTS: readonly string[] = ["WEB"];

export function clientNeedsPoToken(client: string): boolean {
  return PO_TOKEN_CLIENTS.includes(client);
}

/** Lifetime assumed when the server reports none (its usual 12 h, halved). */
const DEFAULT_TTL_SECONDS = 6 * 60 * 60;

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  what: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`${what} timed out after ${timeoutMs} ms`)),
        timeoutMs,
      );
    }),
  ]).finally(() => clearTimeout(timer));
}

export class PoTokenMinter {
  readonly #now: () => number;
  readonly #expiryMarginMs: number;
  readonly #failureCooldownMs: number;
  readonly #timeoutMs: number;
  readonly #cacheSize: number;
  readonly #log: (message: string) => void;

  #host?: PoTokenHost;
  #initializing?: Promise<void>;
  #expiresAt = 0;
  #blockedUntil = 0;
  /** Insertion-ordered, so the first key is the least recently minted. */
  readonly #tokens = new Map<string, {token: string; expiresAt: number}>();

  constructor(options: PoTokenMinterOptions = {}) {
    this.#now = options.now ?? Date.now;
    this.#expiryMarginMs = options.expiryMarginMs ?? 10 * 60 * 1000;
    this.#failureCooldownMs = options.failureCooldownMs ?? 60 * 1000;
    this.#timeoutMs = options.timeoutMs ?? 20 * 1000;
    this.#cacheSize = options.cacheSize ?? 16;
    this.#log = options.onLog ?? (() => {});
  }

  /** Attaches the BotGuard runtime, or detaches it with `undefined`. */
  setHost(host: PoTokenHost | undefined): void {
    if (this.#host === host) {
      return;
    }

    this.#host = host;
    this.reset();
  }

  /** Whether a BotGuard runtime exists on this device at all. */
  get isSupported(): boolean {
    return !!this.#host;
  }

  /**
   * Records that the server did not accept the token for `videoId`.
   *
   * Measured: BotGuard runs vary — some tokens leave a WEB SABR stream at
   * `ATTESTATION_PENDING` although they come from the same code path as the
   * accepted ones, and their length is no reliable tell. Only the server's
   * verdict is, so a rejected token forces a fresh BotGuard run next time.
   */
  reportRejected(videoId: string): void {
    this.#tokens.delete(videoId);
    this.#expiresAt = 0;
  }

  /** Drops the integrity token and every cached token. */
  reset(): void {
    this.#initializing = undefined;
    this.#expiresAt = 0;
    this.#tokens.clear();
  }

  /**
   * Returns a token bound to `videoId`, or `undefined` when none can be had —
   * no runtime on this platform, a recent failure, or a failure right now.
   * Never throws: a missing token must only cost the `WEB` client, not playback.
   */
  async getContentToken(videoId: string): Promise<string | undefined> {
    const host = this.#host;

    if (!host || !videoId) {
      return undefined;
    }

    const cached = this.#tokens.get(videoId);

    if (cached && cached.expiresAt > this.#now()) {
      return cached.token;
    }

    if (this.#now() < this.#blockedUntil) {
      return undefined;
    }

    try {
      await this.#ensureInitialized(host);

      const token = await withTimeout(
        host.mint(videoId),
        this.#timeoutMs,
        "PoToken mint",
      );

      this.#remember(videoId, token);
      return token;
    } catch (error: any) {
      this.#log(`PoToken unavailable: ${String(error?.message ?? error)}`);
      this.reset();
      this.#blockedUntil = this.#now() + this.#failureCooldownMs;
      return undefined;
    }
  }

  async #ensureInitialized(host: PoTokenHost): Promise<void> {
    if (this.#expiresAt > this.#now()) {
      return;
    }

    // Concurrent callers share one initialization instead of each running
    // BotGuard on its own.
    this.#initializing ??= (async () => {
      const started = this.#now();
      const {ttlSeconds} = await withTimeout(
        host.initialize(),
        this.#timeoutMs,
        "BotGuard initialization",
      );
      const lifetimeMs = (ttlSeconds || DEFAULT_TTL_SECONDS) * 1000;

      this.#expiresAt =
        this.#now() + Math.max(lifetimeMs - this.#expiryMarginMs, 0);
      this.#log(
        `BotGuard ready in ${this.#now() - started} ms, valid for ${Math.round(
          lifetimeMs / 60000,
        )} min`,
      );
    })();

    const initializing = this.#initializing;

    try {
      await initializing;
    } finally {
      if (this.#initializing === initializing) {
        this.#initializing = undefined;
      }
    }
  }

  #remember(videoId: string, token: string): void {
    this.#tokens.delete(videoId);
    // A content token lives as long as the integrity token it was minted from.
    this.#tokens.set(videoId, {token, expiresAt: this.#expiresAt});

    while (this.#tokens.size > this.#cacheSize) {
      const oldest = this.#tokens.keys().next().value;

      if (oldest === undefined) {
        break;
      }

      this.#tokens.delete(oldest);
    }
  }
}
