import assert from "node:assert/strict";
import test from "node:test";

import {
  applyWatchLibrarySnapshot,
  buildWatchLibraryViewModel,
  createEmptyWatchLibraryCache,
  createWatchLibraryCommand,
  formatByteSize,
  isWatchLibrarySnapshotOutdated,
  parseWatchLibraryCache,
  parseWatchLibraryCommandResult,
  parseWatchLibrarySnapshot,
  parseWatchLibrarySnapshotJSON,
  parseWatchLibraryStatus,
} from "../src/hooks/watchSync/WatchLibraryProtocol.ts";

function snapshot(overrides = {}) {
  return {
    protocolVersion: 1,
    revision: 3,
    generatedAt: 1780000000000,
    storage: {usedBytes: 2000, availableBytes: 8000},
    videos: [
      {
        id: "a",
        title: "Alpha",
        durationMillis: 1000,
        downloaded: true,
        sizeBytes: 1200,
      },
      {id: "b", title: "Beta", durationMillis: 1000, downloaded: false},
      {id: "c", title: "Gamma", durationMillis: 1000, downloaded: false},
    ],
    playlists: [
      {
        id: "PL1",
        title: "Mix",
        videoIds: ["a", "b"],
        autoDownload: true,
        temp: false,
        linked: false,
        syncVersion: 0,
      },
      {
        id: "home",
        title: "Home",
        videoIds: ["c"],
        autoDownload: false,
        temp: true,
        linked: false,
        syncVersion: 0,
      },
    ],
    activeDownloads: [{id: "b", progress: 0.4}],
    pendingDownloads: ["c"],
    ...overrides,
  };
}

test("parses a valid snapshot and drops malformed entries", () => {
  const parsed = parseWatchLibrarySnapshot(
    snapshot({
      videos: [
        {id: "a", title: "Alpha", durationMillis: 1000, downloaded: true},
        {title: "missing id"},
        "nope",
      ],
      activeDownloads: [{id: "a", progress: 7}],
      pendingDownloads: ["x", 3],
    }),
  );

  assert.deepEqual(
    parsed?.videos.map(video => video.id),
    ["a"],
  );
  assert.equal(parsed?.activeDownloads[0].progress, 1);
  assert.deepEqual(parsed?.pendingDownloads, ["x"]);
});

test("rejects snapshots without revision or protocol version", () => {
  assert.equal(parseWatchLibrarySnapshot({revision: 1}), null);
  assert.equal(parseWatchLibrarySnapshot({protocolVersion: 1}), null);
  assert.equal(parseWatchLibrarySnapshot(null), null);
  assert.equal(parseWatchLibrarySnapshotJSON("{not json"), null);
});

test("defaults missing optional snapshot fields", () => {
  const parsed = parseWatchLibrarySnapshot({protocolVersion: 1, revision: 0});
  assert.deepEqual(parsed, {
    protocolVersion: 1,
    revision: 0,
    generatedAt: 0,
    storage: {usedBytes: 0, availableBytes: 0},
    videos: [],
    playlists: [],
    activeDownloads: [],
    pendingDownloads: [],
  });
});

test("reads the library status from the received application context", () => {
  assert.deepEqual(
    parseWatchLibraryStatus({
      libraryStatus: {
        revision: 5,
        usedBytes: 10,
        availableBytes: 20,
        downloadedCount: 2,
      },
      playing: true,
    }),
    {revision: 5, usedBytes: 10, availableBytes: 20, downloadedCount: 2},
  );
  assert.equal(parseWatchLibraryStatus({playing: true}), null);
  assert.equal(parseWatchLibraryStatus({libraryStatus: {}}), null);
});

test("requests a snapshot only when none is cached or the status is newer", () => {
  const cached = parseWatchLibrarySnapshot(snapshot());
  const status = revision => ({
    revision,
    usedBytes: 0,
    availableBytes: 0,
    downloadedCount: 0,
  });

  assert.equal(isWatchLibrarySnapshotOutdated(null, null), true);
  assert.equal(isWatchLibrarySnapshotOutdated(cached, null), false);
  assert.equal(isWatchLibrarySnapshotOutdated(cached, status(3)), false);
  assert.equal(isWatchLibrarySnapshotOutdated(cached, status(4)), true);
});

test("keeps a newer cached snapshot when an older one arrives late", () => {
  const newer = parseWatchLibrarySnapshot(snapshot({revision: 9}));
  const older = parseWatchLibrarySnapshot(snapshot({revision: 4}));
  const cache = applyWatchLibrarySnapshot(
    createEmptyWatchLibraryCache(),
    newer,
    100,
  );

  assert.equal(applyWatchLibrarySnapshot(cache, older, 200), cache);
  assert.equal(applyWatchLibrarySnapshot(cache, newer, 300).lastSyncAt, 300);
});

test("round-trips the persisted cache and ignores unknown versions", () => {
  const cache = {
    ...applyWatchLibrarySnapshot(
      createEmptyWatchLibraryCache(),
      parseWatchLibrarySnapshot(snapshot()),
      123,
    ),
    status: {revision: 4, usedBytes: 1, availableBytes: 2, downloadedCount: 3},
  };

  assert.deepEqual(parseWatchLibraryCache(JSON.stringify(cache)), cache);
  assert.deepEqual(
    parseWatchLibraryCache(JSON.stringify({...cache, cacheVersion: 99})),
    createEmptyWatchLibraryCache(),
  );
  assert.deepEqual(
    parseWatchLibraryCache("garbage"),
    createEmptyWatchLibraryCache(),
  );
});

test("builds download and playlist rows for the phone", () => {
  const viewModel = buildWatchLibraryViewModel(
    parseWatchLibrarySnapshot(snapshot()),
  );

  assert.deepEqual(
    viewModel.downloads.map(row => [row.id, row.state]),
    [
      ["b", "downloading"],
      ["c", "queued"],
      ["a", "downloaded"],
    ],
  );
  assert.equal(viewModel.downloads[0].progress, 0.4);
  assert.equal(viewModel.downloads[2].sizeBytes, 1200);
  assert.deepEqual(viewModel.playlists, [
    {
      id: "PL1",
      title: "Mix",
      videoCount: 2,
      downloadedCount: 1,
      autoDownload: true,
    },
  ]);
  assert.equal(viewModel.storage.usedFraction, 0.2);
});

test("prefers storage from a newer status over the snapshot", () => {
  const viewModel = buildWatchLibraryViewModel(
    parseWatchLibrarySnapshot(snapshot()),
    {revision: 4, usedBytes: 5000, availableBytes: 5000, downloadedCount: 1},
  );
  assert.equal(viewModel.storage.usedBytes, 5000);
  assert.equal(viewModel.storage.usedFraction, 0.5);
});

test("creates versioned command envelopes and parses their results", () => {
  assert.deepEqual(
    createWatchLibraryCommand("requestSnapshot", {}, "id-1", 7),
    {
      type: "libraryCommand",
      protocolVersion: 1,
      commandId: "id-1",
      issuedAt: 7,
      op: "requestSnapshot",
      args: {},
    },
  );

  assert.deepEqual(
    parseWatchLibraryCommandResult({
      type: "libraryCommandResult",
      commandId: "id-1",
      status: "unsupported",
      error: "Unsupported operation",
      revision: 3,
    }),
    {
      commandId: "id-1",
      status: "unsupported",
      error: "Unsupported operation",
      revision: 3,
    },
  );
  assert.equal(
    parseWatchLibraryCommandResult({
      type: "libraryCommandResult",
      commandId: "id-1",
      status: "maybe",
    }),
    null,
  );
});

test("formats byte sizes with locale-aware decimals", () => {
  assert.equal(formatByteSize(512, "en"), "512 B");
  assert.equal(formatByteSize(3_400_000, "en"), "3.4 MB");
  assert.equal(formatByteSize(3_400_000, "de"), "3,4 MB");
  assert.equal(formatByteSize(812_000_000, "en"), "812 MB");
  assert.equal(formatByteSize(4_900_000_000, "de"), "4,9 GB");
});
