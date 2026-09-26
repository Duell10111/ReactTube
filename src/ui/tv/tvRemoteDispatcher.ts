/**
 * A remote event as `react-native-tvos` reports it. Only the fields the app
 * reads are modelled; the native payload carries more.
 */
export interface TVRemoteEvent {
  eventType: string;
  eventKeyAction?: number;
  tag?: number;
  target?: number;
}

export type TVRemoteListener = (event: TVRemoteEvent) => void;

export interface TVRemoteDispatcher {
  subscribe: (listener: TVRemoteListener) => () => void;
  dispatch: (event: TVRemoteEvent) => void;
  /** Number of live listeners. Exposed so the native attach can be lazy. */
  readonly size: number;
}

export interface TVRemoteDispatcherOptions {
  /** Called when the first listener arrives, to attach the native source. */
  onFirstListener?: () => void;
  /** Called when the last listener leaves, to detach it again. */
  onLastListener?: () => void;
  /** Reports a listener that threw, so one bad listener is not silent. */
  onListenerError?: (error: unknown) => void;
}

/**
 * Fans one native remote event out to every listener.
 *
 * `useTVEventHandler` opens a native subscription per call and re-opens it
 * whenever the handler identity changes. Both are a problem on a feed: every
 * mounted card subscribed, each of them with an inline handler, so a screen of
 * forty cards tore down and rebuilt forty native subscriptions on every render
 * pass — and every key press then walked all forty. This dispatcher keeps one
 * subscription for the whole app and hands the event to the listeners itself.
 *
 * Dispatch iterates a snapshot, so a listener that unsubscribes — or subscribes
 * — while an event is being delivered cannot change the set mid-walk, and a
 * listener that throws does not stop the ones behind it.
 */
export function createTVRemoteDispatcher(
  options: TVRemoteDispatcherOptions = {},
): TVRemoteDispatcher {
  const listeners = new Set<TVRemoteListener>();

  return {
    get size() {
      return listeners.size;
    },
    subscribe(listener: TVRemoteListener) {
      const first = listeners.size === 0;

      listeners.add(listener);

      if (first) {
        options.onFirstListener?.();
      }

      let removed = false;

      return () => {
        if (removed || !listeners.delete(listener)) {
          return;
        }

        removed = true;

        if (listeners.size === 0) {
          options.onLastListener?.();
        }
      };
    },
    dispatch(event: TVRemoteEvent) {
      for (const listener of Array.from(listeners)) {
        if (!listeners.has(listener)) {
          continue;
        }

        try {
          listener(event);
        } catch (error) {
          options.onListenerError?.(error);
        }
      }
    },
  };
}
