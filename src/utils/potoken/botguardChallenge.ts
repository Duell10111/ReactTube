/**
 * Pure parsing helpers for the BotGuard challenge (plan phase 5).
 *
 * Kept free of React Native imports so the Node test runner can load it.
 *
 * The challenge comes from the YouTube homepage, not from the bare
 * `Create`/`att/get` endpoints: measured on 2026-10-04, tokens minted from a
 * bare challenge leave a WEB SABR stream at `ATTESTATION_PENDING` and fail
 * after a seek, while tokens from the homepage's `ytAtN` challenge (with the
 * page's `ytcfg` exposed as `yt.config_`) report `OK` throughout. SmartTube
 * switched to the same source (`PoTokenWebView4#getChallengeFromHomepage`).
 */

export interface BotGuardChallenge {
  /** BotGuard bytecode handed to the VM. */
  program: string;
  /** Name under which the interpreter installs its VM on the global object. */
  globalName: string;
  /** Absolute https URL of the interpreter script. */
  interpreterUrl: string;
  /**
   * The page's first `ytcfg.set({...})` object. BotGuard reads `EVENT_ID`
   * from `yt.config_`; without it the minted token is rejected.
   */
  ytcfg?: Record<string, unknown>;
}

export interface IntegrityTokenResponse {
  /** Base64 integrity token that unlocks the minter. */
  integrityToken: string;
  /** Lifetime the server grants the integrity token, in seconds. */
  ttlSeconds: number;
}

/**
 * Resolves the escapes of a single-quoted JavaScript string literal body.
 *
 * The homepage embeds the challenge as `'\x7b\x22…'`; JSON cannot read
 * `\xHH` or `\'`, so the literal has to be unescaped first.
 */
export function unescapeJsString(literal: string): string {
  return literal.replace(
    /\\(x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|[\s\S])/g,
    (_match, escape: string) => {
      switch (escape[0]) {
        case "x":
        case "u":
          return String.fromCharCode(parseInt(escape.slice(1), 16));
        case "n":
          return "\n";
        case "r":
          return "\r";
        case "t":
          return "\t";
        case "b":
          return "\b";
        case "f":
          return "\f";
        case "v":
          return "\v";
        case "0":
          return "\0";
        default:
          // `\'`, `\"`, `\\`, `\/` and any other character stand for themselves.
          return escape;
      }
    },
  );
}

/** First `ytcfg.set({...});` object of the page, if it parses as JSON. */
export function extractYtcfg(
  html: string,
): Record<string, unknown> | undefined {
  const match = html.match(/ytcfg\.set\((\{[\s\S]+?\})\);/);

  if (!match) {
    return undefined;
  }

  try {
    return JSON.parse(match[1]);
  } catch {
    return undefined;
  }
}

/**
 * Extracts the BotGuard challenge from the homepage HTML.
 *
 * @returns `undefined` when the page carries no usable challenge — e.g. a
 *   consent interstitial instead of the homepage.
 */
export function parseHomepageChallenge(
  html: string,
): BotGuardChallenge | undefined {
  const match = html.match(
    /window\.ytAtN\(\s*\{\s*['"]R['"]\s*:\s*'((?:[^'\\]|\\[\s\S])*)'/,
  );

  if (!match) {
    return undefined;
  }

  let payload: any;

  try {
    payload = JSON.parse(unescapeJsString(match[1]));
  } catch {
    return undefined;
  }

  const challenge = payload?.bgChallenge;
  const interpreterPath: unknown =
    challenge?.interpreterUrl
      ?.privateDoNotAccessOrElseTrustedResourceUrlWrappedValue;

  if (
    typeof challenge?.program !== "string" ||
    typeof challenge?.globalName !== "string" ||
    typeof interpreterPath !== "string"
  ) {
    return undefined;
  }

  return {
    program: challenge.program,
    globalName: challenge.globalName,
    // The page references the interpreter protocol-relative (`//www.google.com/…`).
    interpreterUrl: interpreterPath.startsWith("//")
      ? `https:${interpreterPath}`
      : interpreterPath,
    ytcfg: extractYtcfg(html),
  };
}

/**
 * Reads the `GenerateIT` answer: `[integrityToken, ttlSeconds, refreshThreshold,
 * fallbackToken]`. A `null` token means BotGuard judged the environment
 * untrustworthy — exactly what a hand-written DOM shim produces.
 */
export function parseIntegrityTokenResponse(
  json: unknown,
): IntegrityTokenResponse | undefined {
  if (!Array.isArray(json) || typeof json[0] !== "string" || !json[0]) {
    return undefined;
  }

  const ttlSeconds = Number(json[1]);

  return {
    integrityToken: json[0],
    ttlSeconds: Number.isFinite(ttlSeconds) && ttlSeconds > 0 ? ttlSeconds : 0,
  };
}
