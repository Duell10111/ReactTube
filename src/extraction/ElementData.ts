import {Helpers, YTNodes} from "../utils/Youtube";
import Logger from "../utils/Logger";
import {
  ChannelData,
  ElementData,
  getAuthor,
  PlaylistData,
  VideoData,
} from "./Types";

// TODO: Add ChannelData

// TODO: Split from ElementData in VideoData or PlaylistData

const skippedTypes = [
  // Movies are skipped
  YTNodes.GridMovie,
  YTNodes.Movie,
  // "CompactMovie", // No type available
  // As Long As Mixed do not work
  YTNodes.Mix,
  YTNodes.CompactMix,
];

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
    // LOGGER.warn("FALSE TYPE PROVIDED!");
    return undefined;
  }

  if (ytNode.is(...skippedTypes)) {
    LOGGER.debug("Skipping acknowledged type");
    return undefined;
  }

  // TODO: Maybe split
  if (ytNode.is(YTNodes.Video, YTNodes.CompactVideo)) {
    const duration = ytNode.duration.text;
    return {
      id: ytNode.id,
      title: ytNode.title.toString(),
      thumbnailImage: ytNode.best_thumbnail,
      short_views: ytNode.short_view_count.toString(),
      author: getAuthor(ytNode.author),
      publishDate: ytNode.published.text,
      type: "video",
      duration: duration?.startsWith("N/A") ? undefined : duration,
      livestream: ytNode.is_live,
      originalNode: ytNode,
    } as VideoData;
  } else if (ytNode.is(YTNodes.GridVideo)) {
    return {
      id: ytNode.id,
      title: ytNode.title.toString(),
      thumbnailImage: ytNode.thumbnails[0],
      short_views: ytNode.short_view_count.toString(),
      author: ytNode.author ? getAuthor(ytNode.author) : undefined,
      publishDate: ytNode.published.text,
      type: "video",
      duration: ytNode.duration?.text,
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
  } else if (ytNode.is(YTNodes.CompactPlaylist)) {
    return {
      type: "playlist",
      originalNode: ytNode,
      id: ytNode.id,
      title: ytNode.title.toString(),
      thumbnailImage: ytNode.thumbnails[0],
      videoCount: ytNode.video_count_short.text,
    } as PlaylistData;
  }
  // TODO: Mixes are currently not accessible via yt.js
  // else if (ytNode.is(YTNodes.CompactMix)) {
  //   LOGGER.warn("Compact MIX Content: ", JSON.stringify(ytNode));
  //   const playlistId = ytNode.endpoint.payload?.playlistId;
  //   if (!playlistId) {
  //     LOGGER.warn("playlistId undefined");
  //     return undefined;
  //   }
  //   return {
  //     type: "playlist",
  //     originalNode: ytNode,
  //     id: playlistId,
  //     title: "MIX - " + ytNode.title.toString(),
  //     thumbnailImage: ytNode.thumbnails[0],
  //     videoCount: ytNode.video_count_short.text,
  //   } as PlaylistData;
  // } else if (ytNode.is(YTNodes.Mix)) {
  //   LOGGER.warn("MIX Content: ", JSON.stringify(ytNode));
  //   const playlistId = ytNode.endpoint.payload?.playlistId;
  //   if (!playlistId) {
  //     LOGGER.warn("playlistId undefined");
  //     return undefined;
  //   }
  //   return {
  //     type: "playlist",
  //     originalNode: ytNode,
  //     id: playlistId,
  //     title: "MIX - " + ytNode.title.toString(),
  //     thumbnailImage: ytNode.thumbnails[0],
  //     videoCount: ytNode.video_count_short.text,
  //   } as PlaylistData;
  // }
  // Channel Data
  else if (ytNode.is(YTNodes.GridChannel)) {
    const author = getAuthor(ytNode.author);
    return {
      type: "channel",
      originalNode: ytNode,
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
