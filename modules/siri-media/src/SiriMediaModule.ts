import {NativeModule, requireOptionalNativeModule} from "expo";

import {
  SiriAuthorizationStatus,
  SiriMediaModuleEvents,
  SiriMediaRequest,
  SiriMediaResult,
} from "./SiriMedia.types";

/**
 * Bridge for SiriKit media intents. Requests arrive either as the
 * `onSiriMediaRequest` event or, when they came in before JavaScript listened,
 * through `getPendingRequests()`.
 */
declare class SiriMediaModule extends NativeModule<SiriMediaModuleEvents> {
  /** Returns requests not yet delivered to JavaScript and marks them delivered. */
  getPendingRequests(): SiriMediaRequest[];
  /**
   * Answers Siri. Unknown or already expired request ids are ignored. Title and
   * artist let Siri announce what started playing; `detail` only goes to the
   * system log.
   */
  completeRequest(
    requestId: string,
    result: SiriMediaResult,
    title?: string,
    artist?: string,
    detail?: string,
  ): void;
  /** Mirrors the opt-in setting for the intents extension. */
  setPlaybackEnabled(enabled: boolean): void;
  /**
   * Donates a played track to Siri (`INPlayMediaIntent` interaction) so Siri
   * learns ReactTube as a media app and can suggest the item again.
   */
  donatePlayback(videoId: string, title: string, artist?: string): void;
  /**
   * Registers playlist names as Siri vocabulary and reports the library size
   * (`INMediaUserContext`). Empty values clear both.
   */
  updateLibraryContext(
    playlistTitles: string[],
    libraryItemCount: number,
  ): void;
  getSiriAuthorizationStatus(): SiriAuthorizationStatus;
  requestSiriAuthorization(): Promise<SiriAuthorizationStatus>;
}

/** `null` where the native module is not linked (Android, web). */
export default requireOptionalNativeModule<SiriMediaModule>("SiriMedia");
