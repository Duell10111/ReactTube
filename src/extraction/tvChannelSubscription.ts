interface RawSubscribeButton {
  channelId?: string;
  subscribed?: boolean;
  enabled?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * The first enabled subscribe button for `channelId` anywhere in the tree.
 * Iterative, so the TV browse response of almost a megabyte cannot overflow
 * the stack.
 */
function findSubscribeButton(root: unknown, channelId: string) {
  const stack: unknown[] = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!isRecord(node)) continue;
    const button = node.subscribeButtonRenderer;
    if (isRecord(button)) {
      const candidate = button as RawSubscribeButton;
      if (candidate.channelId === channelId && candidate.enabled) {
        return candidate;
      }
    }
    for (const value of Object.values(node)) {
      if (isRecord(value)) stack.push(value);
    }
  }
  return undefined;
}

/**
 * Reads the signed-in subscription state of a channel from the raw TV browse
 * response.
 *
 * The button sits in the channel header of the TV surface
 * (`tvSurfaceContentRenderer.header.channelHeaderRenderer.buttons`), which the
 * youtubei.js parser drops, so the parsed page never contains it. The header
 * is searched first; the rest of the response only as a fallback, should
 * YouTube move the button.
 */
export function getTVChannelSubscription(
  response: unknown,
  channelId: string,
): boolean | undefined {
  if (!isRecord(response)) return undefined;
  const surface = (
    response.contents as
      | {
          tvBrowseRenderer?: {
            content?: {tvSurfaceContentRenderer?: {header?: unknown}};
          };
        }
      | undefined
  )?.tvBrowseRenderer?.content?.tvSurfaceContentRenderer;
  const button =
    findSubscribeButton(surface?.header, channelId) ??
    findSubscribeButton(response, channelId);
  return typeof button?.subscribed === "boolean"
    ? button.subscribed
    : undefined;
}
