// Relative with extension: the Node test runner resolves no path aliases.
import {
  resolveNextVideo,
  type NextVideoTarget,
} from "../endcard/endscreenModel.ts";

import type {ElementData, YTVideoInfo} from "@/extraction/Types";
import type {YTNodes} from "@/utils/Youtube";

/**
 * Autoplay of the phone/tablet player, kept free of React Native so it can be
 * tested on its own.
 */

/** YouTube's mobile app counts down five seconds before the next video. */
export const AUTOPLAY_COUNTDOWN_SECONDS = 5;

/** Autoplay is on unless the user turned it off, as on YouTube. */
export function isAutoplayEnabled(settings: {
  autoplayEnabled?: boolean;
}): boolean {
  return settings.autoplayEnabled !== false;
}

export interface UpNextVideo {
  videoId: string;
  navEndpoint?: YTNodes.NavigationEndpoint;
  /** Known up front when the video is in the playlist or the feed. */
  title?: string;
  author?: string;
  thumbnailUrl?: string;
}

type UpNextSource = Pick<YTVideoInfo, "playlist"> & {
  originalData: {
    autoplay_video_endpoint?: YTNodes.NavigationEndpoint | null;
  };
};

function isPlayableVideo(element: ElementData) {
  return element.type === "video" || element.type === "mix";
}

function preview(element: ElementData | undefined) {
  if (!element) {
    return {};
  }
  return {
    title: element.title,
    author: "author" in element ? element.author?.name : undefined,
    thumbnailUrl: element.thumbnailImage?.url,
  };
}

/**
 * What autoplay starts after `video`: the next playlist entry, otherwise
 * YouTube's own autoplay pick. The stream clients of the phone do not always
 * return that pick, so the first video of the watch-next feed stands in for
 * it, which is what YouTube shows as "Up next" there anyway.
 *
 * Title and thumbnail come along when the playlist or the feed already has
 * them, so the countdown can show them without another request.
 */
export function resolveUpNext(
  video: UpNextSource,
  watchNextFeed: readonly ElementData[] | undefined,
): UpNextVideo | undefined {
  const target: NextVideoTarget = resolveNextVideo(video);
  const feed = (watchNextFeed ?? []).filter(isPlayableVideo);
  const playlistEntries = video.playlist?.content ?? [];

  if (target.videoId) {
    const known =
      playlistEntries.find(entry => entry.id === target.videoId) ??
      feed.find(entry => entry.id === target.videoId);
    return {
      videoId: target.videoId,
      navEndpoint: target.navEndpoint,
      ...preview(known),
    };
  }

  const first = feed[0];
  if (!first) {
    return undefined;
  }
  return {
    videoId: first.id,
    navEndpoint: "navEndpoint" in first ? first.navEndpoint : undefined,
    ...preview(first),
  };
}
