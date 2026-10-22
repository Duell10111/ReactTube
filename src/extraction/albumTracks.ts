import type {ElementData, Thumbnail} from "./Types";

/**
 * YouTube Music lists album tracks without artwork of their own, because every
 * track shares the album cover. The cover is copied onto those tracks so lists,
 * the queue, and downloads still have an image to show.
 */
export function withAlbumCover(
  items: ElementData[],
  cover?: Thumbnail,
): ElementData[] {
  if (!cover) {
    return items;
  }

  return items.map(item =>
    item.type === "video" && !item.thumbnailImage?.url
      ? {...item, thumbnailImage: cover}
      : item,
  );
}

/**
 * The playlist behind an album (`OLAK5uy_…`). The album itself is addressed by
 * a browse id (`MPREb_…`) that the playlist endpoints do not accept, so
 * features that work on playlists, like linking to the watch, need this id.
 * The play button carries it; the canonical URL is the fallback.
 */
export function getAlbumPlaylistId(
  playEndpointPlaylistId?: unknown,
  canonicalUrl?: string,
): string | undefined {
  if (typeof playEndpointPlaylistId === "string" && playEndpointPlaylistId) {
    return playEndpointPlaylistId;
  }
  const match = canonicalUrl?.match(/[?&]list=([^&#]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}
