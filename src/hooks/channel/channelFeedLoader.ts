export interface ChannelFeedState<Item> {
  items: Item[];
  loading: boolean;
  error?: unknown;
  paginationError?: unknown;
}

interface FeedLoaderOptions<Page, Item> {
  firstPage: () => Promise<Page>;
  nextPage: (page: Page) => Promise<Page | undefined>;
  extract: (page: Page) => Item[];
  onChange: (state: ChannelFeedState<Item>) => void;
}

/** Owns request order so a refresh or tab change cannot append stale pages. */
export function createChannelFeedLoader<Page, Item>({
  firstPage,
  nextPage,
  extract,
  onChange,
}: FeedLoaderOptions<Page, Item>) {
  let generation = 0;
  let disposed = false;
  let pending = false;
  let page: Page | undefined;
  let state: ChannelFeedState<Item> = {items: [], loading: true};
  const publish = (next: ChannelFeedState<Item>) => {
    state = next;
    onChange(state);
  };
  return {
    async refresh() {
      if (disposed) return;
      const request = ++generation;
      page = undefined;
      pending = false;
      publish({items: [], loading: true});
      try {
        const first = await firstPage();
        if (disposed || request !== generation) return;
        const items = extract(first);
        page = first;
        publish({items, loading: false});
      } catch (error) {
        if (!disposed && request === generation)
          publish({items: [], loading: false, error});
      }
    },
    async fetchMore() {
      if (disposed || pending || !page || state.loading) return;
      const request = generation;
      pending = true;
      try {
        const next = await nextPage(page);
        if (disposed || request !== generation) return;
        if (next) {
          const items = extract(next);
          page = next;
          publish({
            ...state,
            items: [...state.items, ...items],
            paginationError: undefined,
          });
        }
      } catch (paginationError) {
        if (!disposed && request === generation)
          publish({...state, paginationError});
      } finally {
        if (request === generation) pending = false;
      }
    },
    dispose() {
      disposed = true;
      generation++;
    },
  };
}
