/** Raw payload of a Siri media request, as delivered by the native module. */
export interface SiriMediaRequest {
  requestId: string;
  intent: "play" | "search";
  /**
   * `handleInApp`: Siri waits for `completeRequest`.
   * `continueInApp`: Siri already opened the app; completing is optional.
   */
  delivery: "handleInApp" | "continueInApp";
  /** `Date.now()`-compatible timestamp of when the app received the intent. */
  receivedAt: number;
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
