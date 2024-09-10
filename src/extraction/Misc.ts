import {Thumbnail, ThumbnailOverlays} from "./Types";
import {Misc, Helpers, YTNodes} from "../utils/Youtube";

import Logger from "@/utils/Logger";

export function getThumbnail(thumbnail: Misc.Thumbnail) {
  return {
    height: thumbnail.height,
    width: thumbnail.width,
    url: thumbnail.url,
  } as Thumbnail;
}

const LOGGER = Logger.extend("EXTRACTION");

export function parseThumbnailOverlays(
  thumbnailOverlays: Helpers.ObservedArray<Helpers.YTNode>,
) {
  const overlay: ThumbnailOverlays = {};
  thumbnailOverlays.forEach(o => {
    if (o.is(YTNodes.ThumbnailOverlayResumePlayback)) {
      LOGGER.debug("Progress: ", o.percent_duration_watched);
      overlay.videoProgress = Number.parseInt(o.percent_duration_watched, 10);
    } else if (o.is(YTNodes.ThumbnailOverlayTimeStatus)) {
      // Skip ThumbnailOverlayTimeStatus which contains duration to show
      // LOGGER.debug("ThumbnailOverlayTimeStatus: ", o);
    } else if (o.is(YTNodes.ThumbnailOverlayNowPlaying)) {
      // Skip ThumbnailOverlayNowPlaying as does not contain infos
    } else if (o.is(YTNodes.ThumbnailOverlayToggleButton)) {
      // Skip ThumbnailOverlayToggleButton only contains tooltip buttons
      // LOGGER.debug("ThumbnailOverlayToggleButton: ", JSON.stringify(o));
    } else if (o.is(YTNodes.ThumbnailOverlayLoadingPreview)) {
      // Skip ThumbnailOverlayLoadingPreview as does not contain infos
    } else if (o.is(YTNodes.ThumbnailOverlayInlineUnplayable)) {
      // Skip ThumbnailOverlayInlineUnplayable as does not contain infos
      // TODO: Disable preview play?!
    } else {
      LOGGER.warn(`Unknown Thumbnail Overlay Type: ${o.type}`);
    }
  });
  return overlay;
}
