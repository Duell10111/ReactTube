import {
  appendShortIds,
  shortIdFromEndpoint,
} from "../../components/shorts/tv/shortsQueueModel.ts";

interface ShortsPage {
  watch_next_feed?: {payload?: Record<string, unknown>}[];
  wn_has_continuation: boolean;
  getWatchNextContinuation(): Promise<ShortsPage>;
}

export interface ShortsQueueState {
  videoIds: string[];
  hasMore: boolean;
}

/** Owns one sequence so late requests cannot modify a replacement queue. */
export class ShortsQueueLoader {
  private page?: ShortsPage;
  private loading = false;
  private disposed = false;
  private state: ShortsQueueState;
  private readonly load: () => Promise<ShortsPage>;
  private readonly publish: (state: ShortsQueueState) => void;
  private readonly onError: (error: unknown) => void;

  constructor(
    initialVideoId: string,
    load: () => Promise<ShortsPage>,
    publish: (state: ShortsQueueState) => void,
    onError: (error: unknown) => void,
  ) {
    this.state = {videoIds: [initialVideoId], hasMore: true};
    this.load = load;
    this.publish = publish;
    this.onError = onError;
  }

  async fetchMore() {
    if (this.disposed || this.loading || !this.state.hasMore) return;
    this.loading = true;
    try {
      // A page can contain only repeats of shorts already in the queue.
      // Follow its continuation instead of leaving the feed stuck at the end.
      const previousLength = this.state.videoIds.length;
      do {
        const page = await (this.page
          ? this.page.getWatchNextContinuation()
          : this.load());
        if (this.disposed) return;
        this.page = page;
        this.state = {
          videoIds: appendShortIds(
            this.state.videoIds,
            (page.watch_next_feed ?? []).map(shortIdFromEndpoint),
          ),
          hasMore: page.wn_has_continuation,
        };
      } while (
        this.state.hasMore &&
        this.state.videoIds.length === previousLength
      );
      this.publish(this.state);
    } catch (error) {
      if (this.disposed) return;
      this.state = {...this.state, hasMore: false};
      this.publish(this.state);
      this.onError(error);
    } finally {
      this.loading = false;
    }
  }

  dispose() {
    this.disposed = true;
  }
}
