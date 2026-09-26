import assert from "node:assert/strict";
import test from "node:test";

import {parseSabrSegmentPath} from "../src/utils/sabrSegmentPath.ts";

/** Wie in SabrPlayback: das angemeldete Präfix mit abschließendem Schrägstrich. */
const ROOT = "/sabr/ab12cd34/seg/";

test("reads the init segment of a format", () => {
  assert.deepEqual(parseSabrSegmentPath(ROOT, `${ROOT}401:/init.mp4`), {
    kind: "init",
    formatKey: "401:",
  });
});

test("reads a media segment", () => {
  assert.deepEqual(parseSabrSegmentPath(ROOT, `${ROOT}401:/42.m4s`), {
    kind: "segment",
    formatKey: "401:",
    sequenceNumber: 42,
  });
});

test("keeps an xtags format key intact", () => {
  // The server decodes the path before handing it over, so the colon and the
  // equals sign arrive as themselves — the key has to match `itag:xtags` exactly
  // or the lookup in the SABR stream misses.
  assert.deepEqual(
    parseSabrSegmentPath(ROOT, `${ROOT}251:acont=dubbed/7.m4s`),
    {kind: "segment", formatKey: "251:acont=dubbed", sequenceNumber: 7},
  );
});

test("rejects anything outside the registered prefix", () => {
  assert.equal(parseSabrSegmentPath(ROOT, "/sabr/ab12cd34/master.m3u8"), null);
  assert.equal(parseSabrSegmentPath(ROOT, "/etc/passwd"), null);
});

test("rejects a path with the wrong number of parts", () => {
  assert.equal(parseSabrSegmentPath(ROOT, `${ROOT}401:/nested/1.m4s`), null);
  assert.equal(parseSabrSegmentPath(ROOT, `${ROOT}1.m4s`), null);
  assert.equal(parseSabrSegmentPath(ROOT, `${ROOT}/1.m4s`), null);
});

test("rejects a file name that is not a segment", () => {
  assert.equal(parseSabrSegmentPath(ROOT, `${ROOT}401:/1.mp4`), null);
  assert.equal(parseSabrSegmentPath(ROOT, `${ROOT}401:/init.m4s`), null);
  assert.equal(parseSabrSegmentPath(ROOT, `${ROOT}401:/abc.m4s`), null);
  assert.equal(parseSabrSegmentPath(ROOT, `${ROOT}401:/-1.m4s`), null);
});

test("does not confuse a similar prefix", () => {
  assert.equal(
    parseSabrSegmentPath(ROOT, "/sabr/ffffffff/seg/401:/1.m4s"),
    null,
  );
});
