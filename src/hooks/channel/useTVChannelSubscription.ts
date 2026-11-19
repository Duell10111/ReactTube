import {useCallback, useEffect, useRef, useState} from "react";

import {useYoutubeTVContext} from "@/context/YoutubeContext";
import Logger from "@/utils/Logger";
import {YTNodes} from "@/utils/Youtube";

const LOGGER = Logger.extend("CHANNEL");

/** Reads and changes subscriptions through the authenticated TV client. */
export function useTVChannelSubscription(channelId: string) {
  const youtube = useYoutubeTVContext();
  const signedIn = Boolean(youtube?.session.logged_in);
  const [subscribed, setSubscribed] = useState<boolean>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0);
  const busy = useRef(false);

  useEffect(() => {
    const request = ++generation.current;
    let active = true;
    setSubscribed(undefined);
    setError(false);
    setPending(signedIn);
    busy.current = false;
    if (youtube && signedIn) {
      youtube.actions
        .execute("/browse", {browseId: channelId, client: "TV", parse: true})
        .then(page => {
          if (!active) return;
          const button =
            page.header_memo?.getType(YTNodes.SubscribeButton)[0] ??
            page.contents_memo?.getType(YTNodes.SubscribeButton)[0];
          // Never infer an account's subscription from the anonymous web header.
          if (button?.enabled) setSubscribed(button.subscribed);
        })
        .catch(reason => {
          if (active) setError(true);
          LOGGER.warn("Loading channel subscription failed", reason);
        })
        .finally(() => {
          if (active) setPending(false);
        });
    }
    return () => {
      active = false;
      if (generation.current === request) generation.current++;
    };
  }, [attempt, channelId, signedIn, youtube]);

  const toggle = useCallback(async () => {
    if (!youtube || !signedIn || subscribed === undefined || busy.current)
      return;
    const request = generation.current;
    busy.current = true;
    setPending(true);
    setError(false);
    try {
      const result = await youtube.actions.execute(
        subscribed ? "/subscription/unsubscribe" : "/subscription/subscribe",
        {
          channelIds: [channelId],
          params: subscribed ? "CgIIAhgA" : "EgIIAhgA",
          client: "TV",
          parse: false,
        },
      );
      if (!result.success) throw new Error("Subscription request failed");
      if (request === generation.current) setSubscribed(!subscribed);
    } catch (reason) {
      if (request === generation.current) setError(true);
      LOGGER.warn("Changing channel subscription failed", reason);
    } finally {
      if (request === generation.current) {
        busy.current = false;
        setPending(false);
      }
    }
  }, [channelId, signedIn, subscribed, youtube]);

  return {
    signedIn,
    subscribed,
    pending,
    error,
    toggle,
    retry: () => setAttempt(value => value + 1),
  };
}
