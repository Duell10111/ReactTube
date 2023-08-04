import {YTNodes, Helpers, Misc} from "../utils/Youtube";
import Logger from "../utils/Logger";

export interface Thumbnail {
  url: string;
  height: number;
  width: number;
}

// TODO: Add ChannelData

// TODO: Split from ElementData in VideoData or PlaylistData

export type ElementData = VideoData | PlaylistData | ChannelData;

export interface VideoData {
  originalNode: Helpers.YTNode;
  type: "video" | "reel";
  id: string;
  thumbnailImage: Thumbnail;
  title: string;
  duration?: string;
  short_views: string;
  publishDate?: string;
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
  thumbnailImage: Thumbnail;
  author?: Author;
  videoCount?: string;
  videos?: string[];
}

export interface ChannelData {
  originalNode: Helpers.YTNode;
  type: "channel";
  id: string;
  title: string;
  thumbnailImage: Thumbnail;
  author?: Author;
}

const skippedTypes = [YTNodes.GridMovie, YTNodes.Movie];

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

export function getVideoData(ytNode: Helpers.YTNode): ElementData | undefined {
  if (!ytNode) {
    LOGGER.warn("FALSE TYPE PROVIDED!");
    return undefined;
  }

  if (ytNode.is(...skippedTypes)) {
    LOGGER.debug("Skipping acknowledged type");
    return undefined;
  }

  // TODO: Maybe split
  if (ytNode.is(YTNodes.Video, YTNodes.CompactVideo)) {
    return {
      id: ytNode.id,
      title: ytNode.title.toString(),
      thumbnailImage: ytNode.best_thumbnail,
      short_views: ytNode.short_view_count.toString(),
      author: getAuthor(ytNode.author),
      publishDate: ytNode.published.text,
      type: "video",
      duration: ytNode.duration.text,
      originalNode: ytNode,
    } as VideoData;
  } else if (ytNode.is(YTNodes.ReelItem)) {
    return {
      id: ytNode.id,
      title: ytNode.title.toString(),
      thumbnailImage: ytNode.thumbnails[0],
      short_views: ytNode.views.toString(),
      duration: "",
      type: "reel",
      originalNode: ytNode,
    } as VideoData;
  } else if (ytNode.is(YTNodes.PlaylistVideo)) {
    return {
      type: "video",
      originalNode: ytNode,
      id: ytNode.id,
      title: ytNode.title.toString(),
      thumbnailImage: ytNode.thumbnails[0],
      short_views: "",
    } as VideoData;
  }
  // Playlist Data
  else if (ytNode.is(YTNodes.GridPlaylist)) {
    return {
      type: "playlist",
      id: ytNode.id,
      title: ytNode.title.toString(),
      thumbnailImage: ytNode.thumbnails[0],
      author: ytNode.author ? getAuthor(ytNode.author) : undefined,
      originalNode: ytNode,
      videoCount: ytNode.video_count_short.text,
    } as PlaylistData;
  } else if (ytNode.is(YTNodes.Playlist)) {
    return {
      type: "playlist",
      originalNode: ytNode,
      id: ytNode.id,
      title: ytNode.title.toString(),
      thumbnailImage: ytNode.thumbnails[0],
      videoCount: ytNode.video_count_short.text,
    } as PlaylistData;
  } else if (ytNode.is(YTNodes.CompactMix)) {
    return {
      type: "playlist",
      originalNode: ytNode,
      id: ytNode.id,
      title: "MIX - " + ytNode.title.toString(),
      thumbnailImage: ytNode.thumbnails[0],
      videoCount: ytNode.video_count_short.text,
    } as PlaylistData;
  } else if (ytNode.is(YTNodes.Mix)) {
    return {
      type: "playlist",
      originalNode: ytNode,
      id: ytNode.id,
      title: "MIX - " + ytNode.title.toString(),
      thumbnailImage: ytNode.thumbnails[0],
      videoCount: ytNode.video_count_short.text,
    } as PlaylistData;
  }
  // Channel Data
  else if (ytNode.is(YTNodes.GridChannel)) {
    const author = getAuthor(ytNode.author);
    return {
      type: "channel",
      id: ytNode.id,
      author: author,
      title: author.name,
      thumbnailImage: author.thumbnail,
    } as ChannelData;
  }
  // Recursive Section
  else if (ytNode.is(YTNodes.RichItem)) {
    // Recursive extraction
    return getVideoData(ytNode.content);
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
