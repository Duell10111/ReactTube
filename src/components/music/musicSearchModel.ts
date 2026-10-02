import type {
  HorizontalData,
  HorizontalDataButton,
} from "@/extraction/ShelfExtraction";

/** Where tapping the header of the top result card leads. */
export type MusicEndpointTarget =
  | {kind: "play"}
  | {kind: "artist"; id: string}
  | {kind: "album"; id: string}
  | {kind: "playlist"; id: string};

/** The parts of a `NavigationEndpoint` the routing decision reads. */
interface EndpointLike {
  payload?: any;
  metadata?: {page_type?: string};
}

/** Music never shows more than two actions on the top result card. */
const maxTopResultActions = 2;

/**
 * The "top result" of a music search is a card shelf: a header for the best
 * match, its play actions, and a few entries of that match. Every other search
 * shelf is a titled list.
 */
export function isMusicTopResult(data: HorizontalData): boolean {
  return data.originalNode?.type === "MusicCardShelf";
}

/**
 * The actions of the top result card, in the order Music delivers them. Only
 * actions with an endpoint can start playback, so the rest are left out.
 */
export function getTopResultActions(
  buttons: HorizontalDataButton[] | undefined,
): HorizontalDataButton[] {
  return (buttons ?? [])
    .filter(button => button.type !== "PLAYLIST_ADD" && button.endpoint)
    .slice(0, maxTopResultActions);
}

export function resolveMusicEndpointTarget(
  endpoint: EndpointLike | undefined,
): MusicEndpointTarget | undefined {
  const payload = endpoint?.payload;

  if (!payload) {
    return undefined;
  }

  if (typeof payload.videoId === "string" && payload.videoId) {
    return {kind: "play"};
  }

  const browseId = payload.browseId;

  if (typeof browseId !== "string" || !browseId) {
    return undefined;
  }

  const pageType: string | undefined =
    payload.browseEndpointContextSupportedConfigs
      ?.browseEndpointContextMusicConfig?.pageType ??
    endpoint?.metadata?.page_type;

  switch (pageType) {
    case "MUSIC_PAGE_TYPE_ARTIST":
    case "MUSIC_PAGE_TYPE_USER_CHANNEL":
      return {kind: "artist", id: browseId};
    case "MUSIC_PAGE_TYPE_ALBUM":
      return {kind: "album", id: browseId};
    case "MUSIC_PAGE_TYPE_PLAYLIST":
      return {kind: "playlist", id: browseId};
  }

  // Older responses leave out the page type; the id prefix still tells them apart.
  if (browseId.startsWith("UC")) {
    return {kind: "artist", id: browseId};
  }
  if (browseId.startsWith("MPRE")) {
    return {kind: "album", id: browseId};
  }
  if (browseId.startsWith("VL")) {
    return {kind: "playlist", id: browseId};
  }

  return undefined;
}
