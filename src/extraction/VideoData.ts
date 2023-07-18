import {YTNodes, Helpers} from "../utils/Youtube";
import Logger from "../utils/Logger";

export interface Thumbnail {
  url: string;
  height: number;
  width: number;
}

export interface VideoData {
  id: string;
  thumbnailImage: Thumbnail;
  title: string;
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
  if (ytNode.is(YTNodes.Video, YTNodes.CompactVideo)) {
    return {
      id: ytNode.id,
      title: ytNode.title.toString(),
      thumbnailImage: ytNode.best_thumbnail,
    } as VideoData;
  } else {
    LOGGER.warn("getVideoData: Unknown type: ", ytNode.type);
  }
}
