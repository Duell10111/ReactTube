import Logger from "@/utils/Logger";
import {Innertube, Utils} from "@/utils/Youtube";
import {WatchHistoryRequest, buildWatchHistoryUrl} from "@/utils/watchHistory";

const LOGGER = Logger.extend("HISTORY");

/**
 * The only client that answers the signed-in TV session with a playable
 * response — and only playable responses carry `playbackTracking` (see
 * `signedInPlayback.ts`).
 */
const TRACKING_CLIENT = "TV_DOWNGRADED";

/** Account-bound stats URLs of one video, plus the nonce of this playback. */
export interface WatchHistoryContext {
  videoId: string;
  playbackUrl: string;
  watchtimeUrl: string;
  /** Client playback nonce; ties all reports of one playback together. */
  cpn: string;
  lengthSec?: number;
}

/**
 * Fetches the stats URLs from a `/player` response of the signed-in session.
 *
 * Like SmartTube's `syncWithAuthInfoIfNeeded`: the streams come from anonymous
 * clients, whose tracking parameters do not belong to the account.
 *
 * @returns `undefined` when not signed in or the response has no tracking.
 */
export async function fetchWatchHistoryContext(
  signedInYoutube: Innertube,
  videoId: string,
): Promise<WatchHistoryContext | undefined> {
  if (!signedInYoutube.session.logged_in) {
    return undefined;
  }

  const response = await signedInYoutube.actions.execute("/player", {
    videoId,
    client: TRACKING_CLIENT,
    racyCheckOk: true,
    contentCheckOk: true,
    playbackContext: {
      contentPlaybackContext: {
        signatureTimestamp: signedInYoutube.session.player?.signature_timestamp,
      },
    },
  });
  const tracking = response.data.playbackTracking;

  if (!tracking?.videostatsPlaybackUrl || !tracking.videostatsWatchtimeUrl) {
    LOGGER.warn(
      `No playback tracking for ${videoId} ` +
        `(${response.data.playabilityStatus?.status ?? "unknown status"})`,
    );
    return undefined;
  }

  const lengthSec = Number(response.data.videoDetails?.lengthSeconds);

  return {
    videoId,
    playbackUrl: tracking.videostatsPlaybackUrl.baseUrl,
    watchtimeUrl: tracking.videostatsWatchtimeUrl.baseUrl,
    cpn: Utils.generateRandomString(16),
    lengthSec: lengthSec > 0 ? lengthSec : undefined,
  };
}

/**
 * Sends the planned stats requests in order with the session's OAuth token.
 *
 * youtubei.js only authenticates Innertube requests, so the token is attached
 * here — SmartTube sends it to `/api/stats/` as well.
 */
export async function sendWatchHistoryRequests(
  signedInYoutube: Innertube,
  context: WatchHistoryContext,
  requests: WatchHistoryRequest[],
): Promise<void> {
  const oauth = signedInYoutube.session.oauth;

  if (oauth.shouldRefreshToken()) {
    await oauth.refreshAccessToken();
  }

  const accessToken = oauth.oauth2_tokens?.access_token;
  const headers: Record<string, string> = accessToken
    ? {Authorization: `Bearer ${accessToken}`}
    : {};

  for (const request of requests) {
    const baseUrl =
      request.endpoint === "playback"
        ? context.playbackUrl
        : context.watchtimeUrl;
    const url = buildWatchHistoryUrl(baseUrl, context.cpn, request.params);
    await signedInYoutube.session.http.fetch(new URL(url), {headers});
  }
}
