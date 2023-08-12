import {YT} from "../utils/Youtube";
import {YTVideoInfo} from "./Types";
import {getThumbnail} from "./Misc";

export function getElementDataFromVideoInfo(videoInfo: YT.VideoInfo) {
  const thumbnail = videoInfo.basic_info.thumbnail
    ? videoInfo.basic_info.thumbnail
        .map(getThumbnail)
        .find(thumb => !thumb.url.endsWith("webp")) // Do not use webp for iOS!
    : undefined;

  return {
    originalData: videoInfo,
    id: videoInfo.basic_info.id,
    duration: videoInfo.basic_info.duration,
    livestream: videoInfo.basic_info.is_live,
    thumbnailImage: thumbnail,
    title: videoInfo.basic_info.title,
    short_views: videoInfo.primary_info?.short_view_count.text,
  } as YTVideoInfo;
}
