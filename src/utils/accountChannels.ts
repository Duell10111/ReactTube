/**
 * Channels of the signed-in account, for acting as a brand channel.
 *
 * Kept free of React Native imports so the Node test runner can load it.
 *
 * A browser session is the primary Google account acting as one of its
 * channels. The TV sign-in instead binds the token to whatever was picked on
 * google.com/device, and a brand account has no age — measured on 2026-10-04,
 * age-restricted videos then fail with "Sign in to your primary account to
 * confirm your age". Signed in with the primary account, setting
 * `context.user.onBehalfOfUser` to the brand channel's `pageId` gives both:
 * the age-verified identity and the channel's private videos. It can be
 * switched at runtime on the live session; `/account/accounts_list` then
 * reports the brand channel as selected.
 */

export interface AccountChannel {
  /** Display name, e.g. the brand channel's title. */
  name: string;
  handle?: string;
  photoUrl?: string;
  /**
   * `pageId` of a brand channel — the value for `onBehalfOfUser`. Undefined
   * for the primary account itself.
   */
  pageId?: string;
  /** Whether the session currently acts as this channel. */
  selected: boolean;
}

function findAccountItems(node: unknown, found: any[]): any[] {
  if (Array.isArray(node)) {
    node.forEach(child => findAccountItems(child, found));
  } else if (node && typeof node === "object") {
    const record = node as Record<string, unknown>;

    if (record.accountItem && typeof record.accountItem === "object") {
      found.push(record.accountItem);
    }

    Object.values(record).forEach(child => findAccountItems(child, found));
  }

  return found;
}

function pageIdOf(item: any): string | undefined {
  const tokens: any[] =
    item?.serviceEndpoint?.selectActiveIdentityEndpoint?.supportedTokens ?? [];

  return tokens.find(token => token?.pageIdToken?.pageId)?.pageIdToken.pageId;
}

/**
 * Reads the raw `/account/accounts_list` response (TV client). The account's
 * e-mail address (`accountByline`) is deliberately not carried over.
 */
export function parseAccountChannels(response: unknown): AccountChannel[] {
  return findAccountItems(response, [])
    .filter(item => !item.isDisabled && item.accountName?.simpleText)
    .map(item => {
      const thumbnails: {url?: string; width?: number}[] =
        item.accountPhoto?.thumbnails ?? [];
      const photo = [...thumbnails].sort(
        (a, b) => (b.width ?? 0) - (a.width ?? 0),
      )[0];

      return {
        name: item.accountName.simpleText as string,
        handle: item.channelHandle?.simpleText,
        photoUrl: photo?.url,
        pageId: pageIdOf(item),
        selected: !!item.isSelected,
      };
    });
}

/**
 * Whether the sign-in is a primary account that owns brand channels — only
 * then is there anything to choose. A token bound to a brand account directly
 * lists just that one entry.
 */
export function hasChannelChoice(channels: AccountChannel[]): boolean {
  return (
    channels.some(channel => !channel.pageId) &&
    channels.some(channel => !!channel.pageId)
  );
}
