import {useEffect, useRef} from "react";
import {Platform, TVEventHandler} from "react-native";

import {
  createTVRemoteDispatcher,
  type TVRemoteEvent,
  type TVRemoteListener,
} from "./tvRemoteDispatcher";

import LOGGER from "@/utils/Logger";

let nativeSubscription: {remove: () => void} | undefined;

const dispatcher = createTVRemoteDispatcher({
  onFirstListener: () => {
    if (!Platform.isTV) {
      return;
    }

    nativeSubscription = TVEventHandler.addListener(event =>
      dispatcher.dispatch(event as TVRemoteEvent),
    );
  },
  onLastListener: () => {
    nativeSubscription?.remove();
    nativeSubscription = undefined;
  },
  onListenerError: error => LOGGER.warn("TV remote listener failed", error),
});

/** Exposed for diagnostics; the app always goes through the hook. */
export const tvRemote = dispatcher;

/**
 * Subscribes to the remote for as long as the component needs it.
 *
 * The handler is held in a ref instead of in the subscription, so a component
 * that re-renders on every focus change — a media card does — keeps one stable
 * subscription while its handler still sees current state. Passing
 * `enabled: false` unsubscribes entirely, which is how a card listens for a
 * long press only while it is the focused one.
 */
export function useTVRemoteEvent(
  handler: TVRemoteListener,
  enabled = true,
): void {
  const handlerRef = useRef(handler);

  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled || !Platform.isTV) {
      return;
    }

    return dispatcher.subscribe(event => handlerRef.current(event));
  }, [enabled]);
}
