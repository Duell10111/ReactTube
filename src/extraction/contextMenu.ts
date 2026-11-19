import type {ContextMenu} from "./Types";

/**
 * The parts of a navigation endpoint the context menu type depends on. Kept
 * structural so the mapping can be tested without a parsed response.
 */
interface ContextMenuEndpoint {
  name?: string;
  payload?: {browseId?: string};
}

/**
 * Maps the endpoint of a long-press menu item to the action the app offers
 * for it. Tiles and lockups both deliver their menus this way.
 */
export function getContextMenuType(
  endpoint?: ContextMenuEndpoint,
): ContextMenu["type"] | undefined {
  switch (endpoint?.name) {
    case "browseEndpoint":
      return endpoint.payload?.browseId?.startsWith("UC")
        ? "channel"
        : "browse";
    case "watchEndpoint":
      return "watch";
    case "addToPlaylistEndpoint":
      return "addToPlaylist";
    case "playlistEditEndpoint":
      return "addToWatchLater";
    case "feedbackEndpoint":
      return "feedback";
  }
}
