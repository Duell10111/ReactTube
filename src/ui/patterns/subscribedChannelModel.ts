import type {Translate} from "./mediaCardModel";

import type {SubscribedChannel} from "@/extraction/subscribedChannels";

/** Props of `ChannelAvatar`, shared by its touch and TV variants. */
export interface ChannelAvatarProps {
  channel: SubscribedChannel;
  /** Whether the subscriptions feed is filtered to this channel. */
  selected?: boolean;
  onPress: () => void;
  testID?: string;
}

/**
 * Screen reader label of a subscribed channel. The new-content dot is purely
 * visual, so the label carries that state instead.
 */
export function getSubscribedChannelLabel(
  channel: SubscribedChannel,
  translate: Translate,
): string {
  return channel.hasNewContent
    ? translate("subscriptions.channels.newContentLabel", {
        channel: channel.title,
      })
    : channel.title;
}

/**
 * Splits the channels into those with new uploads and the rest, keeping
 * YouTube's order within both groups. The full list shows the new ones as a
 * section of their own, as the TV app does.
 */
export function groupSubscribedChannels(channels: SubscribedChannel[]): {
  withNewContent: SubscribedChannel[];
  others: SubscribedChannel[];
} {
  return {
    withNewContent: channels.filter(channel => channel.hasNewContent),
    others: channels.filter(channel => !channel.hasNewContent),
  };
}
