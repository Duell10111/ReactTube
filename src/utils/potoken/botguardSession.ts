/**
 * The network half of a BotGuard run (plan phase 5.1), independent of where
 * the VM executes. The WebView host supplies a {@link BotGuardPageBridge}; a
 * Node check can drive the very same page under jsdom.
 *
 * Kept free of React Native imports so the Node test runner can load it.
 */
import {
  parseHomepageChallenge,
  parseIntegrityTokenResponse,
} from "./botguardChallenge.ts";

/** Calls into `window.__potoken` of the BotGuard page. */
export interface BotGuardPageBridge {
  call(method: "start", challenge: unknown): Promise<string>;
  call(method: "unlock", integrityToken: string): Promise<null>;
  call(method: "mint", identifier: string): Promise<string>;
}

/**
 * Desktop Safari on macOS — the same identity SmartTube's WebView generator
 * presents. The WebView must use it as well, so the challenge and the
 * environment that answers it look like one browser.
 */
export const BOTGUARD_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";

const REQUEST_KEY = "O43z0dpjhgX20SCx4KAo";
const GOOGLE_API_KEY = "AIzaSyDyT5W0Jh49F30Pqqtyfdf7pDLFKLJoAnw";
const GENERATE_IT_URL = "https://www.youtube.com/api/jnn/v1/GenerateIT";

type FetchLike = (
  input: string,
  init?: {method?: string; headers?: Record<string, string>; body?: string},
) => Promise<{ok: boolean; status: number; text(): Promise<string>}>;

/**
 * Fetches the homepage challenge, runs it in the page and unlocks the minter.
 * Afterwards `bridge.call("mint", videoId)` yields tokens.
 */
export async function initializeBotGuard(
  bridge: BotGuardPageBridge,
  fetchFn: FetchLike = fetch as unknown as FetchLike,
): Promise<{ttlSeconds: number}> {
  const homepage = await fetchFn("https://www.youtube.com/", {
    headers: {
      "User-Agent": BOTGUARD_USER_AGENT,
      "Accept-Language": "en-US,en;q=0.7",
      Accept: "*/*",
      // Skips the EU consent interstitial, which carries no challenge.
      Cookie: "SOCS=CAE=",
    },
  });

  if (!homepage.ok) {
    throw new Error(`Homepage: HTTP ${homepage.status}`);
  }

  const challenge = parseHomepageChallenge(await homepage.text());

  if (!challenge) {
    throw new Error("Homepage carries no BotGuard challenge");
  }

  const botguardResponse = await bridge.call("start", challenge);

  const integrity = await fetchFn(GENERATE_IT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json+protobuf",
      Accept: "application/json",
      "User-Agent": BOTGUARD_USER_AGENT,
      "x-goog-api-key": GOOGLE_API_KEY,
      "x-user-agent": "grpc-web-javascript/0.1",
    },
    body: JSON.stringify([REQUEST_KEY, botguardResponse]),
  });

  if (!integrity.ok) {
    throw new Error(`GenerateIT: HTTP ${integrity.status}`);
  }

  const token = parseIntegrityTokenResponse(JSON.parse(await integrity.text()));

  if (!token) {
    throw new Error("GenerateIT returned no integrity token");
  }

  await bridge.call("unlock", token.integrityToken);

  return {ttlSeconds: token.ttlSeconds};
}
