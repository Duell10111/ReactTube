import type {ElementData} from "@/extraction/Types";

export interface MediaCardRoutingOptions {
  /**
   * Treats the element as music even when the data source left
   * `element.music` unset. Locally stored playlists and their tracks carry no
   * music marker, so a card has to state that it lives on a music surface.
   */
  music?: boolean;
  /** Route the card is rendered in, to detect a navigation onto itself. */
  currentRouteName?: string;
}

export type MediaCardTarget =
  | {kind: "playlist"; routeName: "MusicPlaylistScreen" | "PlaylistScreen"}
  | {kind: "album"; routeName: "MusicAlbumScreen"}
  | {kind: "channel"; routeName: "MusicChannelScreen" | "ChannelScreen"}
  | {kind: "musicPlayer"}
  | {kind: "videoPlayer"};

export interface MediaCardRoute {
  target: MediaCardTarget;
  /**
   * Replacing instead of stacking keeps the back stack free of a chain of
   * playlists when one playlist links to the next. Only the playlist and album
   * screens link onward to themselves, so only those replace.
   */
  replace: boolean;
}

/**
 * Where pressing a media card leads. Kept apart from the navigating hook so the
 * decision — above all whether a track opens in the music or the video player —
 * can be verified on its own.
 */
export function resolveMediaCardRoute(
  element: ElementData,
  options: MediaCardRoutingOptions = {},
): MediaCardRoute {
  const music = element.music === true || options.music === true;

  const target = resolveTarget(element, music);
  const selfLinking = target.kind === "playlist" || target.kind === "album";

  return {
    target,
    replace: selfLinking && target.routeName === options.currentRouteName,
  };
}

function resolveTarget(element: ElementData, music: boolean): MediaCardTarget {
  if (element.type === "album") {
    return {kind: "album", routeName: "MusicAlbumScreen"};
  }

  if (element.type === "playlist") {
    return {
      kind: "playlist",
      routeName: music ? "MusicPlaylistScreen" : "PlaylistScreen",
    };
  }

  if (
    element.type === "channel" ||
    element.type === "artist" ||
    element.type === "profile"
  ) {
    return {
      kind: "channel",
      routeName: music ? "MusicChannelScreen" : "ChannelScreen",
    };
  }

  if (music && (element.type === "video" || element.type === "mix")) {
    return {kind: "musicPlayer"};
  }

  return {kind: "videoPlayer"};
}
