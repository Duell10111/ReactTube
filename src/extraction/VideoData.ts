import {YTNodes, Helpers, Misc} from "../utils/Youtube";
import Logger from "../utils/Logger";

export interface Thumbnail {
  url: string;
  height: number;
  width: number;
}

export interface VideoData {
  originalNode: Helpers.YTNode;
  id: string;
  thumbnailImage: Thumbnail;
  title: string;
  type: "video" | "reel";
  short_views: string;
  author?: Author;
  quality?: string;
}

export interface Author {
  id: string;
  name: string;
  thumbnail: Thumbnail;
}

const LOGGER = Logger.extend("EXTRACTION");

export function getVideoDataOfFirstElement(
  dataArr: Helpers.ObservedArray<Helpers.YTNode>,
) {
  const index = dataArr.findIndex(v => {
    return getVideoData(v) !== undefined;
  });
  return getVideoData(dataArr[index]);
}

// Exclude not supported formats? e.x. CompactMovies

export function getVideoData(ytNode: Helpers.YTNode) {
  // TODO: Maybe split
  if (ytNode.is(YTNodes.Video, YTNodes.CompactVideo)) {
    ytNode.author;
    return {
      id: ytNode.id,
      title: ytNode.title.toString(),
      thumbnailImage: ytNode.best_thumbnail,
      short_views: ytNode.short_view_count.toString(),
      author: getAuthor(ytNode.author),
      type: "video",
      originalNode: ytNode,
    } as VideoData;
  } else if (ytNode.is(YTNodes.ReelItem)) {
    return {
      id: ytNode.id,
      title: ytNode.title.toString(),
      thumbnailImage: ytNode.thumbnails[0],
      short_views: ytNode.views.toString(),
      type: "reel",
      originalNode: ytNode,
    } as VideoData;
  } else {
    LOGGER.warn("getVideoData: Unknown type: ", ytNode.type);
  }
}

export function getAuthor(author: Misc.Author) {
  return {
    id: author.id,
    name: author.name,
    thumbnail: author.best_thumbnail,
  } as Author;
}
