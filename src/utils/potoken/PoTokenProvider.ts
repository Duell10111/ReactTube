/**
 * App-wide PoToken access (plan phase 5).
 *
 * The BotGuard runtime is the invisible WebView mounted by
 * `PoTokenWebViewHost`; it registers itself here. tvOS has no WebView, so
 * nothing registers there and every request resolves to `undefined` at once —
 * the client chain simply keeps using clients that need no token.
 */
import {clientNeedsPoToken, PoTokenMinter} from "./PoTokenMinter";

import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("POTOKEN");

export const poTokenMinter = new PoTokenMinter({
  onLog: message => LOGGER.info(message),
});

/** Token bound to `videoId`, or `undefined` if this device cannot mint one. */
export function getContentPoToken(
  videoId: string,
): Promise<string | undefined> {
  return poTokenMinter.getContentToken(videoId);
}

/**
 * Per-client token supplier for `getPlayableInfo({po_token_for})`.
 * Mints only for clients that measurably benefit, so the other clients in the
 * chain never wait for BotGuard.
 */
export function poTokenForClient(
  videoId: string,
): (client: string) => Promise<string | undefined> | undefined {
  return client =>
    clientNeedsPoToken(client) ? getContentPoToken(videoId) : undefined;
}

export {clientNeedsPoToken};
