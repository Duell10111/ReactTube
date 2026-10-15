import assert from "node:assert/strict";
import test from "node:test";

import {
  RECORD_RENEW_MS,
  buildWatchHistoryUrl,
  clampReportPosition,
  planWatchHistoryReport,
} from "../src/utils/watchHistory.ts";

const NOW = 1_000_000;

test("a first report early in the video creates an entry and counts from 0", () => {
  const plan = planWatchHistoryReport(undefined, {
    videoId: "a",
    positionSec: 42,
    lengthSec: 600,
    nowMs: NOW,
  });
  assert.deepEqual(plan.requests, [
    {endpoint: "playback", params: {len: "600.000", cmt: "0.000"}},
    {
      endpoint: "watchtime",
      params: {len: "600.000", st: "0.000", et: "42.000", cmt: "42.000"},
    },
  ]);
  assert.deepEqual(plan.record, {
    videoId: "a",
    positionSec: 42,
    reportedAtMs: NOW,
  });
});

test("a first report past the start threshold starts at that position", () => {
  const plan = planWatchHistoryReport(undefined, {
    videoId: "a",
    positionSec: 300,
    lengthSec: 1200,
    nowMs: NOW,
  });
  assert.equal(plan.requests[0].params.cmt, "300.000");
  assert.equal(plan.requests[1].params.st, "300.000");
});

test("later reports of the same video only add the watched segment", () => {
  const previous = {videoId: "a", positionSec: 42, reportedAtMs: NOW};
  const plan = planWatchHistoryReport(previous, {
    videoId: "a",
    positionSec: 222,
    lengthSec: 600,
    nowMs: NOW + 180_000,
  });
  assert.deepEqual(plan.requests, [
    {
      endpoint: "watchtime",
      params: {len: "600.000", st: "42.000", et: "222.000", cmt: "222.000"},
    },
  ]);
});

test("an outdated record or another video creates a new entry", () => {
  const previous = {videoId: "a", positionSec: 42, reportedAtMs: NOW};
  const outdated = planWatchHistoryReport(previous, {
    videoId: "a",
    positionSec: 60,
    lengthSec: 600,
    nowMs: NOW + RECORD_RENEW_MS + 1,
  });
  assert.equal(outdated.requests[0].endpoint, "playback");
  // The segment still continues from the last known position.
  assert.equal(outdated.requests[1].params.st, "42.000");

  const other = planWatchHistoryReport(previous, {
    videoId: "b",
    positionSec: 10,
    lengthSec: 600,
    nowMs: NOW + 1000,
  });
  assert.equal(other.requests[0].endpoint, "playback");
  assert.equal(other.requests[1].params.st, "0.000");
});

test("less than 5 % remaining marks the video as fully watched", () => {
  const plan = planWatchHistoryReport(undefined, {
    videoId: "a",
    positionSec: 580,
    lengthSec: 600,
    nowMs: NOW,
  });
  assert.deepEqual(plan.requests, [
    {endpoint: "playback", params: {final: "1"}},
    {
      endpoint: "watchtime",
      params: {st: "600.000", et: "600.000", final: "1"},
    },
  ]);
});

test("reported positions never fall below 3 seconds", () => {
  assert.equal(clampReportPosition(0), 3);
  assert.equal(clampReportPosition(1.5), 3);
  assert.equal(clampReportPosition(12), 12);
});

test("request URLs keep the account parameters and go to www.youtube.com", () => {
  const url = new URL(
    buildWatchHistoryUrl(
      "https://s.youtube.com/api/stats/watchtime?docid=a&ei=E&of=O&vm=V&len=599",
      "CPN",
      {len: "600.000", st: "0.000", et: "42.000"},
    ),
  );
  assert.equal(url.host, "www.youtube.com");
  assert.equal(url.pathname, "/api/stats/watchtime");
  assert.equal(url.searchParams.get("docid"), "a");
  assert.equal(url.searchParams.get("ei"), "E");
  assert.equal(url.searchParams.get("of"), "O");
  assert.equal(url.searchParams.get("vm"), "V");
  assert.equal(url.searchParams.get("len"), "600.000");
  assert.equal(url.searchParams.get("ver"), "2");
  assert.equal(url.searchParams.get("cpn"), "CPN");
  assert.equal(url.searchParams.get("et"), "42.000");
});
