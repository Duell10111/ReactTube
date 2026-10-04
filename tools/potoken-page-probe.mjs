#!/usr/bin/env node
/**
 * Runs the app's BotGuard WebView page (src/utils/potoken/botguardPage.ts)
 * under jsdom against the live services and prints a content-bound PoToken.
 *
 * It exercises exactly the code the device runs — page script, challenge
 * parser and GenerateIT flow — only the browser is jsdom instead of a WebView.
 * Check the token afterwards in the fork:
 *
 *   TOKEN=$(node tools/potoken-page-probe.mjs bUHZ2k9DYHY)
 *   (cd ../../YouTube.js && POT_VALUE=$TOKEN node dev-scripts/phase6-verify.mjs bUHZ2k9DYHY WEB)
 *
 * jsdom is borrowed from the youtubei.js checkout (the app does not depend on it).
 */
import {createRequire} from "node:module";

import {BOTGUARD_PAGE_HTML} from "../src/utils/potoken/botguardPage.ts";
import {
  BOTGUARD_USER_AGENT,
  initializeBotGuard,
} from "../src/utils/potoken/botguardSession.ts";

const videoId = process.argv[2] ?? "bUHZ2k9DYHY";
const requireFromFork = createRequire(
  createRequire(import.meta.url).resolve("youtubei.js/package.json"),
);
const {JSDOM} = requireFromFork("jsdom");

const dom = new JSDOM(BOTGUARD_PAGE_HTML, {
  url: "https://www.youtube.com/",
  runScripts: "dangerously",
  resources: {userAgent: BOTGUARD_USER_AGENT},
  pretendToBeVisual: true,
});

let nextId = 0;
const pending = new Map();

dom.window.ReactNativeWebView = {
  postMessage(data) {
    const message = JSON.parse(data);
    const entry = pending.get(message.id);
    pending.delete(message.id);
    if (message.ok) entry?.resolve(message.value);
    else entry?.reject(new Error(message.error));
  },
};

const bridge = {
  call(method, argument) {
    const id = ++nextId;
    return new Promise((resolve, reject) => {
      pending.set(id, {resolve, reject});
      dom.window.__potoken[method](id, argument);
    });
  },
};

// The WebView host injects only after onLoadEnd; BotGuard started while the
// document is still loading mints the weaker token that SABR rejects.
if (dom.window.document.readyState !== "complete") {
  await new Promise(resolve => dom.window.addEventListener("load", resolve));
}

const started = Date.now();
const {ttlSeconds} = await initializeBotGuard(bridge);
const token = await bridge.call("mint", videoId);

console.error(
  `BotGuard ready in ${Date.now() - started} ms · TTL ${ttlSeconds} s · token ${token.length} chars`,
);
console.log(token);
dom.window.close();
