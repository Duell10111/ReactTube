import {YTNodes, Helpers, Misc} from "../utils/Youtube";
import Logger from "../utils/Logger";

export interface Thumbnail {
  url: string;
  height: number;
  width: number;
}

// TODO: Split from ElementData in VideoData or PlaylistData

export type ElementData = VideoData | PlaylistData;

export interface VideoData {
  originalNode: Helpers.YTNode;
  type: "video" | "reel";
  id: string;
  thumbnailImage: Thumbnail;
  title: string;
  short_views: string;
  author?: Author;
  quality?: string;
}

export interface Author {
  id: string;
  name: string;
  thumbnail: Thumbnail;
}

export interface PlaylistData {
  originalNode: Helpers.YTNode;
  type: "playlist";
  id: string;
  title: string;
  author?: Author;
  videos?: string[];
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

// TODO: Rename to ElementData

export function getVideoData(ytNode: Helpers.YTNode) {
  // TODO: Maybe split
  if (ytNode.is(YTNodes.Video, YTNodes.CompactVideo)) {
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
  } else if (ytNode.is(YTNodes.GridPlaylist)) {
    return {
      type: "playlist",
      id: ytNode.id,
      title: ytNode.title.toString(),
      author: ytNode.author ? getAuthor(ytNode.author) : undefined,
      originalNode: ytNode,
    } as PlaylistData;
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
