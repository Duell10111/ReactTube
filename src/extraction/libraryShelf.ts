import type {HorizontalData} from "./ShelfExtraction";
import type {ElementData} from "./Types";

/** Where the "see all" action of a library shelf leads. */
export type LibraryShelfTarget =
  | {type: "history"}
  | {type: "playlist"; playlistId: string};

export const watchLaterPlaylistId = "WL";

/** Watch later, addressed either as a playlist id or as its browse id. */
export function isWatchLaterPlaylistId(playlistId: string): boolean {
  return playlistId === watchLaterPlaylistId || playlistId === "VLWL";
}

interface EndpointLike {
  payload?: {browseId?: unknown; playlistId?: unknown};
}

function getPayloadString(
  endpoint: unknown,
  key: "browseId" | "playlistId",
): string | undefined {
  const value = (endpoint as EndpointLike | undefined)?.payload?.[key];

  return typeof value === "string" ? value : undefined;
}

/**
 * The Watch later shelf of the TV library. Its header carries no endpoint, so
 * it is recognised by its entries: every one of them plays inside Watch later.
 */
export function isWatchLaterShelf(shelf: HorizontalData): boolean {
  return (
    shelf.parsedData.length > 0 &&
    shelf.parsedData.every(
      item =>
        "navEndpoint" in item &&
        getPayloadString(item.navEndpoint, "playlistId") ===
          watchLaterPlaylistId,
    )
  );
}

/**
 * Target of a library shelf's "see all" action. History and playlist shelves
 * name their browse id in the header endpoint; Watch later is recognised by
 * its entries. Shelves without a full list, such as the playlists overview,
 * have no target.
 */
export function getLibraryShelfTarget(
  shelf: HorizontalData,
): LibraryShelfTarget | undefined {
  const browseId = getPayloadString(
    (shelf.originalNode as {endpoint?: unknown}).endpoint,
    "browseId",
  );

  if (browseId === "FEhistory") {
    return {type: "history"};
  }

  if (browseId?.startsWith("VL")) {
    return {type: "playlist", playlistId: browseId.slice(2)};
  }

  if (isWatchLaterShelf(shelf)) {
    return {type: "playlist", playlistId: watchLaterPlaylistId};
  }

  return undefined;
}

/**
 * Entries of a playlist delivered oldest first, newest first. YouTube appends
 * new Watch later entries to the end and offers the TV session no sort order,
 * so the order is reversed after every page has been loaded. Entries repeated
 * across page boundaries are kept once.
 */
export function newestFirst(pages: ElementData[][]): ElementData[] {
  const seen = new Set<string>();
  const unique: ElementData[] = [];

  for (const page of pages) {
    for (const item of page) {
      if (seen.has(item.id)) {
        continue;
      }

      seen.add(item.id);
      unique.push(item);
    }
  }

  return unique.reverse();
}
