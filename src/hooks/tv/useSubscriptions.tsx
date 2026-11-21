import {useCallback, useEffect, useRef, useState} from "react";

import {useYoutubeTVContext} from "@/context/YoutubeContext";
import {parseObservedArrayHorizontalData} from "@/extraction/ArrayExtraction";
import {HorizontalData} from "@/extraction/ShelfExtraction";
import {
  parseSubscribedChannels,
  SubscribedChannel,
} from "@/extraction/subscribedChannels";
import Logger from "@/utils/Logger";
import {YTNodes, YTTV} from "@/utils/Youtube";

const LOGGER = Logger.extend("SUBS");

export default function useSubscriptions() {
  const youtube = useYoutubeTVContext();
  const subFeed = useRef<YTTV.SubscriptionsFeed>(undefined);
  // Each fetch takes a number, so a response that arrives after the user has
  // switched to another channel is dropped instead of replacing the feed.
  const fetchCount = useRef(0);
  const [data, setData] = useState<HorizontalData[]>([]);
  const [channels, setChannels] = useState<SubscribedChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<SubscribedChannel>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<unknown>();

  const fetchFeed = useCallback(
    (channel?: SubscribedChannel) => {
      if (!youtube) {
        return;
      }

      const fetchId = ++fetchCount.current;
      setError(undefined);
      // The filtered page is the one a channel tab of the TV subscriptions
      // page opens; it has the same layout as the unfiltered one.
      const request = channel
        ? new YTNodes.NavigationEndpoint({
            browseEndpoint: {
              browseId: "FEsubscriptions",
              params: channel.feedParams,
            },
          })
            .call(youtube.actions, {client: "TV"})
            .then(
              response => new YTTV.SubscriptionsFeed(response, youtube.actions),
            )
        : youtube.tv.getSubscriptionsFeed();

      request
        .then(value => {
          if (fetchId !== fetchCount.current) {
            return;
          }
          subFeed.current = value;
          setData(parseObservedArrayHorizontalData(value.items));
          // Only the first page of the unfiltered feed lists the channels;
          // continuations and filtered pages carry none.
          if (!channel) {
            setChannels(parseSubscribedChannels(value.channels));
          }
        })
        .catch(reason => {
          if (fetchId !== fetchCount.current) {
            return;
          }
          LOGGER.warn("Error fetching subscriptions feed: ", reason);
          setError(reason);
        })
        .finally(() => {
          if (fetchId !== fetchCount.current) {
            return;
          }
          setLoading(false);
          setRefreshing(false);
        });
    },
    [youtube],
  );

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const fetchMore = useCallback(async () => {
    const current = subFeed.current;
    if (!current?.has_continuation) {
      LOGGER.debug("No continuation available");
      return;
    }

    const update = await current.getContinuation();
    // A channel switch while the page was loading replaced the feed.
    if (subFeed.current !== current) {
      return;
    }
    subFeed.current = update;
    setData(previous => [
      ...previous,
      ...parseObservedArrayHorizontalData(update.items),
    ]);
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetchFeed(selectedChannel);
  }, [fetchFeed, selectedChannel]);

  /** Filters the feed to one channel, or shows all channels again. */
  const selectChannel = useCallback(
    (channel?: SubscribedChannel) => {
      setSelectedChannel(channel);
      subFeed.current = undefined;
      setData([]);
      setLoading(true);
      setRefreshing(false);
      fetchFeed(channel);
    },
    [fetchFeed],
  );

  return {
    data,
    channels,
    selectedChannel,
    selectChannel,
    fetchMore,
    refresh,
    refreshing,
    loading: loading || !youtube,
    error,
  };
}
