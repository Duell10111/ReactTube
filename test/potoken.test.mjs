import assert from "node:assert/strict";
import test from "node:test";

import {
  sabrPlaybackClients,
  PLAYBACK_CLIENTS_SABR,
} from "../src/utils/PlaybackClientProfiles.ts";
import {
  clientNeedsPoToken,
  PoTokenMinter,
} from "../src/utils/potoken/PoTokenMinter.ts";
import {
  extractYtcfg,
  parseHomepageChallenge,
  parseIntegrityTokenResponse,
  unescapeJsString,
} from "../src/utils/potoken/botguardChallenge.ts";

/** Escapes JSON the way the homepage embeds it: `\xHH` for structural chars. */
function escapeLikeHomepage(text) {
  return text.replace(/[{}[\]":,'\\]/g, char =>
    char === "\\"
      ? "\\\\"
      : `\\x${char.charCodeAt(0).toString(16).padStart(2, "0")}`,
  );
}

function homepage({challenge, ytcfg = {EVENT_ID: "evt", VISITOR_DATA: "v"}}) {
  const payload = escapeLikeHomepage(JSON.stringify(challenge)).replace(
    /\//g,
    "\\/",
  );
  return [
    "<html><script>",
    `ytcfg.set(${JSON.stringify(ytcfg)});`,
    "</script><script>(function(){",
    `window.ytAtN({'R': '${payload}','T': 'AQRG\\x3d',});`,
    "})();</script></html>",
  ].join("");
}

const CHALLENGE = {
  responseContext: {},
  challenge: "abc",
  bgChallenge: {
    interpreterUrl: {
      privateDoNotAccessOrElseTrustedResourceUrlWrappedValue:
        "//www.google.com/js/th/abc.js",
    },
    interpreterHash: "hash",
    program: "prog'ram/with\"quotes",
    globalName: "trayride",
    clientExperimentsStateBlob: "blob",
  },
};

test("unescapes the escapes used in the homepage literal", () => {
  assert.deepEqual(JSON.parse(unescapeJsString("\\x7b\\x22a\\x22:1\\x7d")), {
    a: 1,
  });
  assert.equal(unescapeJsString("it\\'s \\/ \\\\ \\u00e4"), "it's / \\ ä");
});

test("parses the ytAtN challenge and the page config", () => {
  const parsed = parseHomepageChallenge(homepage({challenge: CHALLENGE}));

  assert.deepEqual(parsed, {
    program: "prog'ram/with\"quotes",
    globalName: "trayride",
    interpreterUrl: "https://www.google.com/js/th/abc.js",
    ytcfg: {EVENT_ID: "evt", VISITOR_DATA: "v"},
  });
});

test("returns undefined for a page without a challenge", () => {
  assert.equal(
    parseHomepageChallenge("<html>consent.youtube.com</html>"),
    undefined,
  );
  const {bgChallenge, ...withoutBg} = CHALLENGE;
  assert.ok(bgChallenge);
  assert.equal(
    parseHomepageChallenge(homepage({challenge: withoutBg})),
    undefined,
  );
});

test("keeps the challenge when the page config is unreadable", () => {
  const html = homepage({challenge: CHALLENGE}).replace(
    /ytcfg\.set\(.*?\);/,
    "ytcfg.set({broken: true,});",
  );
  assert.equal(extractYtcfg(html), undefined);
  assert.equal(parseHomepageChallenge(html)?.globalName, "trayride");
});

test("reads GenerateIT answers and rejects a missing token", () => {
  assert.deepEqual(parseIntegrityTokenResponse(["tok", 43200, 1, "fb"]), {
    integrityToken: "tok",
    ttlSeconds: 43200,
  });
  // What BotGuard answers for an environment it does not trust.
  assert.equal(
    parseIntegrityTokenResponse([null, 43200, null, "fb"]),
    undefined,
  );
  assert.equal(parseIntegrityTokenResponse({}), undefined);
});

test("only WEB asks for a token, and only there WEB joins the SABR chain", () => {
  assert.equal(clientNeedsPoToken("WEB"), true);
  assert.equal(clientNeedsPoToken("IOS"), false);
  assert.equal(clientNeedsPoToken("VISIONOS"), false);

  assert.deepEqual(sabrPlaybackClients(false), PLAYBACK_CLIENTS_SABR);
  assert.ok(!sabrPlaybackClients(false).includes("WEB"));
  assert.deepEqual(sabrPlaybackClients(true), ["VISIONOS", "WEB", "IOS"]);
});

function fakeHost({ttlSeconds = 3600, failInit = 0} = {}) {
  const host = {
    initCalls: 0,
    mintCalls: 0,
    failInit,
    async initialize() {
      host.initCalls++;
      if (host.failInit > 0) {
        host.failInit--;
        throw new Error("no challenge");
      }
      return {ttlSeconds};
    },
    async mint(identifier) {
      host.mintCalls++;
      return `pot-${identifier}-${host.initCalls}`;
    },
  };
  return host;
}

function clock(start = 1_000_000) {
  const state = {now: start};
  return {state, now: () => state.now};
}

test("without a host every request is undefined", async () => {
  const minter = new PoTokenMinter();
  assert.equal(minter.isSupported, false);
  assert.equal(await minter.getContentToken("vid"), undefined);
});

test("caches per video and shares one BotGuard run", async () => {
  const host = fakeHost();
  const minter = new PoTokenMinter({expiryMarginMs: 0});
  minter.setHost(host);

  const [a, b] = await Promise.all([
    minter.getContentToken("vid"),
    minter.getContentToken("other"),
  ]);

  assert.equal(a, "pot-vid-1");
  assert.equal(b, "pot-other-1");
  assert.equal(host.initCalls, 1);
  assert.equal(await minter.getContentToken("vid"), "pot-vid-1");
  assert.equal(host.mintCalls, 2);
});

test("re-runs BotGuard once the integrity token expired", async () => {
  const time = clock();
  const host = fakeHost({ttlSeconds: 60});
  const minter = new PoTokenMinter({now: time.now, expiryMarginMs: 10_000});
  minter.setHost(host);

  assert.equal(await minter.getContentToken("vid"), "pot-vid-1");
  time.state.now += 49_000;
  assert.equal(await minter.getContentToken("vid"), "pot-vid-1");
  time.state.now += 2_000;
  assert.equal(await minter.getContentToken("vid"), "pot-vid-2");
  assert.equal(host.initCalls, 2);
});

test("a failure blocks further attempts for the cooldown", async () => {
  const time = clock();
  const host = fakeHost({failInit: 1});
  const minter = new PoTokenMinter({now: time.now, failureCooldownMs: 60_000});
  minter.setHost(host);

  assert.equal(await minter.getContentToken("vid"), undefined);
  assert.equal(await minter.getContentToken("vid"), undefined);
  assert.equal(host.initCalls, 1);

  time.state.now += 60_001;
  assert.equal(await minter.getContentToken("vid"), "pot-vid-2");
});

test("a rejected token forces a fresh BotGuard run", async () => {
  const host = fakeHost();
  const minter = new PoTokenMinter();
  minter.setHost(host);

  assert.equal(await minter.getContentToken("vid"), "pot-vid-1");
  minter.reportRejected("vid");
  assert.equal(await minter.getContentToken("vid"), "pot-vid-2");
  assert.equal(host.initCalls, 2);
});

test("a hanging host times out instead of blocking playback", async () => {
  const minter = new PoTokenMinter({timeoutMs: 20});
  minter.setHost({
    initialize: () => new Promise(() => {}),
    mint: async () => "never",
  });

  assert.equal(await minter.getContentToken("vid"), undefined);
});

test("evicts the oldest video beyond the cache size", async () => {
  const host = fakeHost();
  const minter = new PoTokenMinter({cacheSize: 2});
  minter.setHost(host);

  await minter.getContentToken("a");
  await minter.getContentToken("b");
  await minter.getContentToken("c");
  const mintsBefore = host.mintCalls;

  await minter.getContentToken("b");
  await minter.getContentToken("c");
  assert.equal(host.mintCalls, mintsBefore);
  await minter.getContentToken("a");
  assert.equal(host.mintCalls, mintsBefore + 1);
});
