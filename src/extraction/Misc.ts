import {Thumbnail, ThumbnailOverlays} from "./Types";
import {Misc, Helpers, YTNodes} from "../utils/Youtube";

import Logger from "@/utils/Logger";

export function getThumbnail(thumbnail: Misc.Thumbnail) {
  const url = thumbnail.url;
  return {
    height: thumbnail.height,
    width: thumbnail.width,
    // Workaround for url issue with Channel Thumbnails
    url: url.startsWith("//") ? url.replace("//", "https://") : thumbnail.url,
  } as Thumbnail;
}

const LOGGER = Logger.extend("EXTRACTION");

// Matches durations like "1:02" or "1:02:03"
const DURATION_REGEX = /^\d{1,2}(:\d{2}){1,2}$/;

/**
 * Extracts the duration shown on a thumbnail.
 *
 * Newer responses replace ThumbnailOverlayTimeStatus with the
 * ThumbnailOverlayBadgeView view model, which carries the duration as one of
 * possibly several badges (e.x. "4K", "LIVE", "12:34").
 */
export function getDurationFromThumbnailOverlays(
  thumbnailOverlays?: Helpers.ObservedArray<Helpers.YTNode>,
) {
  const timeStatus = thumbnailOverlays?.firstOfType(
    YTNodes.ThumbnailOverlayTimeStatus,
  )?.text;
  if (timeStatus) {
    return timeStatus;
  }
  return thumbnailOverlays
    ?.firstOfType(YTNodes.ThumbnailOverlayBadgeView)
    ?.badges?.find(badge => DURATION_REGEX.test(badge.text))?.text;
}

export function parseThumbnailOverlays(
  thumbnailOverlays: Helpers.ObservedArray<Helpers.YTNode>,
) {
  const overlay: ThumbnailOverlays = {};
  thumbnailOverlays.forEach(o => {
    if (o.is(YTNodes.ThumbnailOverlayResumePlayback)) {
      LOGGER.debug("Progress: ", o.percent_duration_watched);
      overlay.videoProgress = o.percent_duration_watched;
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
    } else if (o.is(YTNodes.ThumbnailOverlayBadgeView)) {
      // Skip ThumbnailOverlayBadgeView which contains duration to show
    } else if (o.is(YTNodes.ThumbnailOverlayInlineUnplayable)) {
      // Skip ThumbnailOverlayInlineUnplayable as does not contain infos
      // TODO: Disable preview play?!
    } else {
      LOGGER.warn(`Unknown Thumbnail Overlay Type: ${o.type}`);
    }
  });
  return overlay;
}
