import type {ContextMenu, ElementData} from "@/extraction/Types";

/**
 * Context menu types the video menu leaves out: opening the element and
 * feedback are not menu actions, and the channel gets its own entry.
 */
const hiddenContextMenuTypes: ContextMenu["type"][] = [
  "browse",
  "watch",
  "channel",
  "feedback",
];

/** Entries of YouTube's own context menu the video menu offers. */
export function getVideoMenuEntries(data: ElementData): ContextMenu[] {
  if (!("contextMenu" in data) || !data.contextMenu) {
    return [];
  }

  return data.contextMenu.filter(
    entry => !hiddenContextMenuTypes.includes(entry.type),
  );
}

/**
 * Channel the menu's channel entry opens. YouTube's own channel entry wins
 * because it also covers elements whose author carries no browse ID.
 */
export function resolveVideoMenuChannelId(
  data: ElementData,
): string | undefined {
  const contextMenuChannelId =
    "contextMenu" in data
      ? data.contextMenu?.find(entry => entry.type === "channel")?.navEndpoint
          ?.payload.browseId
      : undefined;
  if (contextMenuChannelId) {
    return contextMenuChannelId;
  }

  if (data.type === "video" || data.type === "reel") {
    return data.author?.id || undefined;
  }

  return data.type === "channel" ? data.id : undefined;
}
