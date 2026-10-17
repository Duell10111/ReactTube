/** Raw payload of a Siri media request, as delivered by the native module. */
export interface SiriMediaRequest {
  requestId: string;
  /**
   * `siriKit`: media intent resolved by the intents extension.
   * `appIntent`: App Shortcut; only `mediaName` is set.
   */
  source: "siriKit" | "appIntent";
  /**
   * `affinity`: like/dislike ("I like this song");
   * `add`: add to a playlist or the library.
   */
  intent: "play" | "search" | "affinity" | "add";
  affinity?: "like" | "dislike" | "unknown";
  /** Where an `add` request should put the item. */
  destination?: "library" | "playlist";
  playlistName?: string;
  /**
   * `handleInApp`: Siri waits for `completeRequest`.
   * `continueInApp`: Siri already opened the app; completing is optional.
   */
  delivery: "handleInApp" | "continueInApp";
  /** `Date.now()`-compatible timestamp of when the app received the intent. */
  receivedAt: number;
  /**
   * `Date.now()`-compatible time after which Siri no longer waits; only set
   * when Siri waits for `completeRequest`.
   */
  deadline?: number;
  /** True when Siri launched the app in the background and React started headless. */
  headlessStart: boolean;
  applicationState: "active" | "inactive" | "background" | "unknown";
  connectedScenes: number;
  /** Raw `INMediaItemType` value. */
  mediaType?: number;
  /** Raw `INMediaReference` value. */
  reference?: number;
  mediaName?: string;
  artistName?: string;
  albumName?: string;
  genreNames?: string[];
  moodNames?: string[];
  /** Identifier the extension resolved, e.g. `rt:search:1?q=…`. */
  itemIdentifier?: string;
  playShuffled?: boolean;
  /** Raw `INPlaybackQueueLocation` value. */
  queueLocation?: number;
  /** Raw `INPlaybackRepeatMode` value. */
  repeatMode?: number;
}

export type SiriMediaResult =
  | "success"
  | "notFound"
  | "loginRequired"
  | "failure";

export type SiriAuthorizationStatus =
  | "authorized"
  | "denied"
  | "restricted"
  | "notDetermined"
  | "unknown";

export type SiriMediaModuleEvents = {
  onSiriMediaRequest: (request: SiriMediaRequest) => void;
};
