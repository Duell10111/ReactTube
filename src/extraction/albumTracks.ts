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
