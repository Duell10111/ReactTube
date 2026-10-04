#!/usr/bin/env node
/**
 * Builds a self-driving BotGuard page for `tools/botguard-webview-probe.swift`.
 *
 * It is the app's page (src/utils/potoken/botguardPage.ts) plus a driver that
 * runs the network half in-page — same-origin thanks to the youtube.com base
 * URL — using the app's own challenge parser. The result (`TOKEN <pot> TTL
 * <s>` or `ERROR …`) is posted to the `reacttube` message handler, which
 * exercises the native message path as well.
 *
 *   node tools/botguard-webview-probe-page.mjs <videoId> <out.html>
 */
import fs from "node:fs";

import * as challenge from "../src/utils/potoken/botguardChallenge.ts";
import {BOTGUARD_PAGE_HTML} from "../src/utils/potoken/botguardPage.ts";

const videoId = process.argv[2] ?? "bUHZ2k9DYHY";
const output = process.argv[3] ?? "botguard-probe.html";

// Node strips the type annotations, so the parser's source is plain JS.
const helpers = [
  challenge.unescapeJsString,
  challenge.extractYtcfg,
  challenge.parseHomepageChallenge,
  challenge.parseIntegrityTokenResponse,
]
  .map(fn => fn.toString())
  .join("\n");

const driver = `<script>
${helpers}
var pending = {}, nextId = 0;
window.ReactNativeWebView = { postMessage: function (data) {
  var m = JSON.parse(data); var p = pending[m.id]; delete pending[m.id];
  m.ok ? p.resolve(m.value) : p.reject(new Error(m.error));
} };
function call(method, arg) {
  var id = ++nextId;
  return new Promise(function (resolve, reject) {
    pending[id] = {resolve: resolve, reject: reject};
    window.__potoken[method](id, arg);
  });
}
function report(text) { window.webkit.messageHandlers.reacttube.postMessage(text); }
(async function () {
  var t0 = Date.now(), stages = [];
  function stage(name) { stages.push(name + " " + (Date.now() - t0) + "ms"); }
  try {
    var html = await (await fetch("https://www.youtube.com/", {credentials: "omit"})).text();
    var ch = parseHomepageChallenge(html);
    if (!ch) throw new Error("no challenge, html " + html.length);
    stage("homepage");
    var bg = await call("start", ch);
    stage("snapshot");
    var it = await (await fetch("https://www.youtube.com/api/jnn/v1/GenerateIT", {
      method: "POST", credentials: "omit",
      headers: {"Content-Type": "application/json+protobuf",
        "x-goog-api-key": "AIzaSyDyT5W0Jh49F30Pqqtyfdf7pDLFKLJoAnw",
        "x-user-agent": "grpc-web-javascript/0.1"},
      body: JSON.stringify(["O43z0dpjhgX20SCx4KAo", bg])})).json();
    var tok = parseIntegrityTokenResponse(it);
    if (!tok) throw new Error("no integrity token");
    stage("GenerateIT");
    await call("unlock", tok.integrityToken);
    stage("unlock");
    var pot = await call("mint", ${JSON.stringify(videoId)});
    stage("mint");
    report("TOKEN " + pot + " TTL " + tok.ttlSeconds + " · " + stages.join(", "));
  } catch (e) { report("ERROR " + (e && e.stack || e)); }
})();
</script>`;

fs.writeFileSync(
  output,
  BOTGUARD_PAGE_HTML.replace("</body>", `${driver}</body>`),
);
