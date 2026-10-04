/**
 * tvOS has no WebView, so BotGuard cannot run and no PoToken is minted.
 * `poTokenMinter` stays without a host and answers every request with
 * `undefined`; the client chain keeps to clients that need no token.
 */
export default function PoTokenWebViewHost() {
  return null;
}
