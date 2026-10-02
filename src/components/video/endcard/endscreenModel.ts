import type {
  ElementData,
  YTEndscreenElement,
  YTVideoInfo,
} from "@/extraction/Types";
import type {YTNodes} from "@/utils/Youtube";

/**
 * Pure rules of the end-of-video flow. The player decides with them when the
 * creator's end cards are on screen, and the end screen decides what plays
 * next — kept free of React so both decisions are covered by tests.
 */

export interface EndscreenSurface {
  /** A TV has no browser, so a website card would be a dead end there. */
  canOpenWebsites: boolean;
}

export function isEndscreenElementSupported(
  element: Pick<YTEndscreenElement, "style">,
  surface: EndscreenSurface,
) {
  return element.style !== "WEBSITE" || surface.canOpenWebsites;
}

function isWithinElementWindow(
  element: Pick<YTEndscreenElement, "startDuration" | "endDuration">,
  currentTime: number,
) {
  if (!Number.isFinite(element.startDuration)) {
    return false;
  }
  if (currentTime < element.startDuration) {
    return false;
  }
  // A missing or inverted end means the card stays until the video ends.
  if (
    !Number.isFinite(element.endDuration) ||
    element.endDuration <= element.startDuration
  ) {
    return true;
  }
  return currentTime < element.endDuration;
}

/**
 * The cards that belong on screen at `currentTime`. YouTube staggers them, so
 * each one keeps its own window. `ignoreTiming` is for an end screen the user
 * opened on purpose before its time, which would otherwise be empty.
 */
export function getActiveEndscreenElements<
  T extends Pick<YTEndscreenElement, "style" | "startDuration" | "endDuration">,
>(
  elements: T[],
  currentTime: number,
  surface: EndscreenSurface,
  ignoreTiming = false,
): T[] {
  return elements.filter(
    element =>
      isEndscreenElementSupported(element, surface) &&
      (ignoreTiming || isWithinElementWindow(element, currentTime)),
  );
}

/** The creator's cards as a row after the video, once each. */
export function getEndscreenRecommendations<
  T extends Pick<YTEndscreenElement, "id" | "style">,
>(elements: T[] | undefined, surface: EndscreenSurface): T[] {
  const seen = new Set<string>();

  return (elements ?? []).filter(element => {
    if (
      !isEndscreenElementSupported(element, surface) ||
      seen.has(element.id)
    ) {
      return false;
    }
    seen.add(element.id);
    return true;
  });
}

export interface EndscreenVisibilityInput {
  currentTime: number;
  /** Start of the end screen; missing when the video has none. */
  startSeconds?: number;
  /** After the video ended, the end screen hands over to the up-next surface. */
  ended: boolean;
  /** The user hid the cards for the current pass through the end screen. */
  dismissed: boolean;
  /** The user asked for the cards before their time. */
  forced: boolean;
}

export function isEndscreenShown({
  currentTime,
  startSeconds,
  ended,
  dismissed,
  forced,
}: EndscreenVisibilityInput) {
  if (ended) {
    return false;
  }
  if (forced) {
    return true;
  }
  if (
    dismissed ||
    startSeconds === undefined ||
    !Number.isFinite(startSeconds)
  ) {
    return false;
  }
  return currentTime >= startSeconds;
}

export interface CountdownState {
  remainingSeconds: number;
  /** 0 when the countdown starts, 1 when it has elapsed. */
  progress: number;
  elapsed: boolean;
}

export function getCountdownState(
  elapsedMs: number,
  totalSeconds: number,
): CountdownState {
  const totalMs = Math.max(0, totalSeconds * 1000);
  const clampedElapsed = Math.min(Math.max(0, elapsedMs), totalMs);

  return {
    remainingSeconds: Math.ceil((totalMs - clampedElapsed) / 1000),
    progress: totalMs === 0 ? 1 : clampedElapsed / totalMs,
    elapsed: clampedElapsed >= totalMs,
  };
}

export interface NextVideoTarget {
  videoId?: string;
  navEndpoint?: YTNodes.NavigationEndpoint;
}

type NextVideoSource = Pick<YTVideoInfo, "playlist"> & {
  originalData: {
    autoplay_video_endpoint?: YTNodes.NavigationEndpoint | null;
  };
};

function getEndpointVideoId(endpoint?: YTNodes.NavigationEndpoint | null) {
  const videoId = endpoint?.payload?.videoId;
  return typeof videoId === "string" ? videoId : undefined;
}

/**
 * What plays after `video`: the next playlist entry while a playlist is
 * playing, otherwise YouTube's autoplay suggestion. The id and the endpoint
 * always describe the same video — the end screen used to pair a playlist id
 * with the autoplay endpoint, and the endpoint wins when the screen loads.
 */
export function resolveNextVideo(video: NextVideoSource): NextVideoTarget {
  const playlist = video.playlist;
  const playlistNext: ElementData | undefined = playlist
    ? playlist.content?.[playlist.current_index + 1]
    : undefined;

  if (playlistNext) {
    return {
      videoId: playlistNext.id,
      navEndpoint:
        "navEndpoint" in playlistNext ? playlistNext.navEndpoint : undefined,
    };
  }

  const autoplay = video.originalData.autoplay_video_endpoint ?? undefined;
  const videoId = getEndpointVideoId(autoplay);

  return videoId ? {videoId, navEndpoint: autoplay} : {};
}
