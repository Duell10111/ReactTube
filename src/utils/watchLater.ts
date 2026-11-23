import {parseObservedArray} from "@/extraction/ArrayExtraction";
import type {ElementData} from "@/extraction/Types";
import {newestFirst, watchLaterPlaylistId} from "@/extraction/libraryShelf";
import Logger from "@/utils/Logger";
import type {Innertube, YTTV} from "@/utils/Youtube";

const LOGGER = Logger.extend("WATCH_LATER");

/**
 * Upper bound of pages read for one Watch later list. A page holds 15 entries
 * and YouTube caps Watch later at 5,000, so this covers every list and still
 * stops a continuation that never ends.
 */
const maxPages = 400;

export interface WatchLaterNewestFirst {
  /** The last page loaded; it carries no further continuation. */
  playlist: YTTV.Playlist;
  items: ElementData[];
}

/**
 * Loads Watch later through the signed-in TV session, newest entry first.
 *
 * The TV client delivers the list oldest first and offers no sort order (the
 * clients that do reject the TV sign-in), so every page is read and the order
 * reversed. When the bound is hit the order is kept as delivered, because a
 * partly reversed list would put an arbitrary entry first.
 */
export async function loadWatchLaterNewestFirst(
  youtube: Innertube,
  first?: YTTV.Playlist,
): Promise<WatchLaterNewestFirst> {
  let playlist = first ?? (await youtube.tv.getPlaylist(watchLaterPlaylistId));
  const pages: ElementData[][] = [parseObservedArray(playlist.items)];

  while (playlist.has_continuation && pages.length < maxPages) {
    playlist = await playlist.getContinuation();
    pages.push(parseObservedArray(playlist.items));
  }

  if (playlist.has_continuation) {
    LOGGER.warn(
      `Watch later exceeds ${maxPages} pages; keeping the delivered order`,
    );
    return {playlist, items: pages.flat()};
  }

  return {playlist, items: newestFirst(pages)};
}
