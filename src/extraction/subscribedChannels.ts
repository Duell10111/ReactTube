import type {Thumbnail} from "./Types";
import type {YTTV} from "../utils/Youtube";

/**
 * A channel the signed-in account subscribes to, as listed next to the TV
 * subscriptions feed.
 *
 * Kept free of React Native imports so the Node test runner can load it.
 */
export interface SubscribedChannel {
  /** `UC…` channel id, the parameter for `ChannelScreen`. */
  id: string;
  title: string;
  /** Largest available avatar. */
  thumbnail?: Thumbnail;
  /** Whether YouTube flags uploads the user has not seen yet. */
  hasNewContent: boolean;
}

type FeedChannel = YTTV.SubscriptionsFeed["channels"][number];

/**
 * Converts the channels of a TV subscriptions feed, keeping YouTube's order:
 * channels with recent uploads first, the rest alphabetically.
 *
 * Channels without a readable id are dropped because the app could not open
 * them, and duplicates keep their first position.
 */
export function parseSubscribedChannels(
  channels: readonly FeedChannel[],
): SubscribedChannel[] {
  const seen = new Set<string>();
  const result: SubscribedChannel[] = [];

  for (const channel of channels) {
    if (!channel.id || seen.has(channel.id)) {
      continue;
    }
    seen.add(channel.id);

    const largest = [...channel.thumbnails].sort(
      (a, b) => (b.width ?? 0) - (a.width ?? 0),
    )[0];

    result.push({
      id: channel.id,
      title: channel.title,
      thumbnail: largest?.url
        ? {url: largest.url, width: largest.width, height: largest.height}
        : undefined,
      hasNewContent: channel.has_new_content,
    });
  }

  return result;
}
