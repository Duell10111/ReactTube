import {useCallback, useEffect, useState} from "react";

import {useYoutubeTVContext} from "@/context/YoutubeContext";
import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("CHANNEL");

/**
 * Subscription state of one channel on TV, changed optimistically.
 *
 * It goes through the signed-in TV instance: on TV the web instance only
 * resolves streams anonymously, so a subscription made with it would fail.
 */
export function useSubscriptionToggle(
  channelId: string | undefined,
  initiallySubscribed: boolean | undefined,
) {
  const tvYoutube = useYoutubeTVContext();
  const [subscribed, setSubscribed] = useState(initiallySubscribed ?? false);

  useEffect(() => {
    setSubscribed(initiallySubscribed ?? false);
  }, [initiallySubscribed]);

  const toggle = useCallback(() => {
    if (!channelId || !tvYoutube) {
      LOGGER.warn("Cannot change subscription without channel or session");
      return;
    }

    const next = !subscribed;
    setSubscribed(next);
    (next
      ? tvYoutube.interact.subscribe(channelId)
      : tvYoutube.interact.unsubscribe(channelId)
    ).catch(reason => {
      LOGGER.warn("Subscription change failed: ", reason);
      setSubscribed(!next);
    });
  }, [channelId, subscribed, tvYoutube]);

  return {subscribed, toggle};
}
