import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeWatchLibraryDownloadSort,
  planSelectionRemoval,
  sortWatchLibraryDownloads,
  createVideoCoverMetadata,
  getLocalCoverPath,
  getStoredDurationMillis,
  buildWatchTransferRows,
  createVideoFileMetadata,
  getFileExtension,
  parseWatchDownloadProgress,
  splitByPhoneAvailability,
  withLiveProgress,
  addWatchLibraryPendingCommand,
  applyWatchPlaylistChange,
  createLinkedPlaylist,
  createUpsertPlaylistArgs,
  getLinkedPlaylistStatus,
  parseWatchPlaylistChanged,
  parseWatchPlaylistDeleted,
  planLinkedPlaylistSync,
  removeLinkedPlaylist,
  setLinkedPlaylist,
  supersedePlaylistUpserts,
  applyPendingCommands,
  applyWatchLibraryCommandResult,
  applyWatchLibrarySnapshot,
  buildWatchLibraryViewModel,
  createDownloadVideosArgs,
  createEmptyWatchLibraryCache,
  createWatchLibraryCommand,
  discardWatchLibraryPendingCommand,
  formatByteSize,
  isWatchLibraryCommandStale,
  isWatchLibrarySnapshotOutdated,
  markWatchLibraryCommandFailed,
  resendWatchLibraryPendingCommand,
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

function cacheWithCommand(op, args, revision = 3) {
  const cache = applyWatchLibrarySnapshot(
    createEmptyWatchLibraryCache(),
    parseWatchLibrarySnapshot(snapshot({revision})),
    1,
  );
  return addWatchLibraryPendingCommand(
    cache,
    createWatchLibraryCommand(op, args, "cmd-1", 10),
    10,
  );
}

function result(status, revision, error) {
  return {commandId: "cmd-1", status, revision, error};
}

test("keeps an acknowledged command until a snapshot contains its revision", () => {
  let cache = cacheWithCommand("deleteDownload", {videoIds: ["a"]});
  assert.equal(cache.pendingCommands[0].state, "pending");

  cache = applyWatchLibraryCommandResult(cache, result("ok", 5));
  assert.equal(cache.pendingCommands[0].state, "applied");
  assert.equal(cache.pendingCommands[0].revision, 5);

  cache = applyWatchLibrarySnapshot(
    cache,
    parseWatchLibrarySnapshot(snapshot({revision: 4})),
    20,
  );
  assert.equal(cache.pendingCommands.length, 1);

  cache = applyWatchLibrarySnapshot(
    cache,
    parseWatchLibrarySnapshot(snapshot({revision: 5})),
    30,
  );
  assert.deepEqual(cache.pendingCommands, []);
});

test("drops an acknowledged command at once if the snapshot is already newer", () => {
  const cache = applyWatchLibraryCommandResult(
    cacheWithCommand("deleteDownload", {videoIds: ["a"]}, 8),
    result("ok", 6),
  );
  assert.deepEqual(cache.pendingCommands, []);
});

test("keeps pending commands when a snapshot arrives before the acknowledgement", () => {
  const cache = applyWatchLibrarySnapshot(
    cacheWithCommand("deleteDownload", {videoIds: ["a"]}),
    parseWatchLibrarySnapshot(snapshot({revision: 99})),
    20,
  );
  assert.equal(cache.pendingCommands.length, 1);
});

test("marks rejected, unsupported and undeliverable commands as failed", () => {
  const failed = applyWatchLibraryCommandResult(
    cacheWithCommand("deleteDownload", {videoIds: ["a"]}),
    result("failed", 4, "disk error"),
  ).pendingCommands[0];
  assert.equal(failed.state, "failed");
  assert.equal(failed.error, "disk error");
  assert.equal(failed.unsupported, undefined);

  const unsupported = applyWatchLibraryCommandResult(
    cacheWithCommand("clearAllDownloads", {}),
    result("unsupported", 4),
  ).pendingCommands[0];
  assert.equal(unsupported.unsupported, true);

  const undeliverable = markWatchLibraryCommandFailed(
    cacheWithCommand("deleteDownload", {videoIds: ["a"]}),
    "cmd-1",
    "not reachable",
  ).pendingCommands[0];
  assert.equal(undeliverable.state, "failed");
});

test("resends a command under a new id and discards on request", () => {
  const failed = markWatchLibraryCommandFailed(
    cacheWithCommand("deleteDownload", {videoIds: ["a"]}),
    "cmd-1",
    "boom",
  );
  const resent = resendWatchLibraryPendingCommand(failed, "cmd-1", "cmd-2", 50);
  assert.deepEqual(resent.pendingCommands, [
    {
      command: {
        ...failed.pendingCommands[0].command,
        commandId: "cmd-2",
        issuedAt: 50,
      },
      state: "pending",
      sentAt: 50,
    },
  ]);
  assert.deepEqual(
    discardWatchLibraryPendingCommand(resent, "cmd-2").pendingCommands,
    [],
  );
});

test("flags commands without an answer as stale after a while", () => {
  const [pending] = cacheWithCommand("deleteDownload", {
    videoIds: ["a"],
  }).pendingCommands;
  assert.equal(isWatchLibraryCommandStale(pending, 10 + 60_000), false);
  assert.equal(isWatchLibraryCommandStale(pending, 10 + 31 * 60_000), true);
});

test("persists pending commands in the cache", () => {
  const cache = applyWatchLibraryCommandResult(
    cacheWithCommand("downloadVideos", {videoIds: ["c"]}),
    result("failed", 4, "boom"),
  );
  // Undefined optional fields disappear in JSON, so compare the JSON forms.
  const json = JSON.stringify(cache);
  assert.equal(JSON.stringify(parseWatchLibraryCache(json)), json);
  assert.equal(parseWatchLibraryCache(json).pendingCommands[0].error, "boom");
});

test("marks rows affected by unconfirmed commands and skips failed ones", () => {
  const base = parseWatchLibrarySnapshot(snapshot());
  const command = (op, args, id) => ({
    command: createWatchLibraryCommand(op, args, id, 1),
    state: "pending",
    sentAt: 1,
  });

  const viewModel = applyPendingCommands(base, [
    command("deleteDownload", {videoIds: ["a"]}, "1"),
    command("cancelDownloads", {videoIds: ["b"]}, "2"),
    command(
      "downloadVideos",
      {videoIds: ["new"], videos: [{id: "new", title: "Fresh"}]},
      "3",
    ),
    {...command("removeVideos", {videoIds: ["c"]}, "4"), state: "failed"},
  ]);

  const byId = Object.fromEntries(
    viewModel.downloads.map(row => [row.id, row]),
  );
  assert.equal(byId.a.pendingOp, "deleteDownload");
  assert.equal(byId.b.pendingOp, "cancelDownloads");
  assert.equal(byId.c.pendingOp, undefined);
  assert.equal(byId.new.state, "queued");
  assert.equal(byId.new.title, "Fresh");
  assert.equal(byId.new.pendingOp, "downloadVideos");

  const cleared = applyPendingCommands(base, [
    command("clearAllDownloads", {}, "5"),
  ]);
  assert.ok(
    cleared.downloads.every(row => row.pendingOp === "clearAllDownloads"),
  );
});

test("builds download arguments with property-list friendly metadata", () => {
  const args = createDownloadVideosArgs(
    ["b", "unknown"],
    parseWatchLibrarySnapshot(snapshot()),
  );
  assert.deepEqual(args, {
    videoIds: ["b", "unknown"],
    videos: [{id: "b", durationMillis: 1000, title: "Beta"}],
  });
});

function linked(overrides = {}) {
  return {...createLinkedPlaylist("LC-1", false), ...overrides};
}

test("sends a newly linked playlist to the watch", () => {
  const plan = planLinkedPlaylistSync(linked(), {
    title: "Mix",
    videoIds: ["a", "b"],
  });
  assert.deepEqual(plan, {
    desired: {title: "Mix", videoIds: ["a", "b"]},
    phoneUpdate: null,
    sendToWatch: true,
  });
});

test("does nothing when phone and last sent state agree", () => {
  const state = {title: "Mix", videoIds: ["a", "b"]};
  const plan = planLinkedPlaylistSync(
    linked({syncVersion: 2, sent: state, acked: state, ackedVersion: 2}),
    state,
  );
  assert.equal(plan.sendToWatch, false);
  assert.equal(plan.phoneUpdate, null);
});

test("merges a watch edit and applies it to the phone first", () => {
  const sent = {title: "Mix", videoIds: ["a", "b", "c"]};
  const link = linked({
    syncVersion: 3,
    sent,
    acked: sent,
    ackedVersion: 3,
    pendingWatchChange: {
      title: "Mix",
      videoIds: ["a", "c", "w"],
      baseSyncVersion: 3,
    },
  });
  // The phone added "p" meanwhile.
  const plan = planLinkedPlaylistSync(link, {
    title: "Mix",
    videoIds: ["a", "b", "c", "p"],
  });
  assert.deepEqual(plan.desired.videoIds, ["a", "c", "w", "p"]);
  assert.deepEqual(plan.phoneUpdate, {
    add: ["w"],
    remove: ["b"],
    reorder: true,
  });
  assert.equal(plan.sendToWatch, true);
});

test("merges a stale watch edit against the acknowledged state", () => {
  const acked = {title: "Mix", videoIds: ["a", "b"]};
  const sent = {title: "Mix", videoIds: ["a", "b", "p"]};
  const link = linked({
    syncVersion: 5,
    sent,
    acked,
    ackedVersion: 4,
    // The watch edited version 4 and never saw "p".
    pendingWatchChange: {title: "Mix", videoIds: ["b"], baseSyncVersion: 4},
  });
  const plan = planLinkedPlaylistSync(link, sent);
  assert.deepEqual(plan.desired.videoIds, ["b", "p"]);
});

test("keeps the oldest base when several watch edits queue up", () => {
  let cache = setLinkedPlaylist(createEmptyWatchLibraryCache(), linked());
  cache = applyWatchPlaylistChange(cache, {
    id: "LC-1",
    title: "Mix",
    videoIds: ["a"],
    baseSyncVersion: 2,
  });
  cache = applyWatchPlaylistChange(cache, {
    id: "LC-1",
    title: "Mix",
    videoIds: ["a", "b"],
    baseSyncVersion: 3,
  });
  assert.deepEqual(cache.linkedPlaylists["LC-1"].pendingWatchChange, {
    title: "Mix",
    videoIds: ["a", "b"],
    baseSyncVersion: 2,
  });
  // Edits of unlinked playlists are ignored.
  assert.equal(
    applyWatchPlaylistChange(cache, {
      id: "other",
      title: "",
      videoIds: [],
      baseSyncVersion: 0,
    }),
    cache,
  );
});

test("records the acknowledged state of an upsert", () => {
  const sent = {title: "Mix", videoIds: ["a"]};
  let cache = setLinkedPlaylist(
    createEmptyWatchLibraryCache(),
    linked({syncVersion: 1, sent}),
  );
  cache = addWatchLibraryPendingCommand(
    cache,
    createWatchLibraryCommand(
      "upsertPlaylist",
      {id: "LC-1", title: "Mix", videoIds: ["a"], syncVersion: 1},
      "cmd-1",
      1,
    ),
    1,
  );
  assert.equal(
    getLinkedPlaylistStatus(
      cache.linkedPlaylists["LC-1"],
      cache.pendingCommands,
    ),
    "waitingForWatch",
  );

  cache = applyWatchLibraryCommandResult(cache, {
    commandId: "cmd-1",
    status: "ok",
    revision: 0,
  });
  const link = cache.linkedPlaylists["LC-1"];
  assert.deepEqual(link.acked, sent);
  assert.equal(link.ackedVersion, 1);
  assert.equal(getLinkedPlaylistStatus(link, cache.pendingCommands), "synced");
});

test("derives the sync status of a linked playlist", () => {
  const state = {title: "Mix", videoIds: []};
  const synced = linked({syncVersion: 1, sent: state, ackedVersion: 1});
  assert.equal(getLinkedPlaylistStatus(synced, []), "synced");
  assert.equal(
    getLinkedPlaylistStatus(
      {
        ...synced,
        pendingWatchChange: {title: "", videoIds: [], baseSyncVersion: 1},
      },
      [],
    ),
    "waitingForPhone",
  );
  const failedCommand = {
    command: createWatchLibraryCommand(
      "setPlaylistAutoDownload",
      {id: "LC-1", enabled: true},
      "x",
      1,
    ),
    state: "failed",
    sentAt: 1,
  };
  assert.equal(getLinkedPlaylistStatus(synced, [failedCommand]), "failed");
  assert.equal(
    getLinkedPlaylistStatus({...synced, lastError: "offline"}, []),
    "failed",
  );
});

test("unlinking drops pending playlist commands and newer upserts replace older", () => {
  let cache = setLinkedPlaylist(createEmptyWatchLibraryCache(), linked());
  cache = addWatchLibraryPendingCommand(
    cache,
    createWatchLibraryCommand("upsertPlaylist", {id: "LC-1"}, "u1", 1),
    1,
  );
  cache = addWatchLibraryPendingCommand(
    cache,
    createWatchLibraryCommand("deleteDownload", {videoIds: ["a"]}, "d1", 1),
    1,
  );

  assert.deepEqual(
    supersedePlaylistUpserts(cache, "LC-1").pendingCommands.map(
      pending => pending.command.commandId,
    ),
    ["d1"],
  );
  const unlinked = removeLinkedPlaylist(cache, "LC-1");
  assert.deepEqual(unlinked.linkedPlaylists, {});
  assert.deepEqual(
    unlinked.pendingCommands.map(pending => pending.command.commandId),
    ["d1"],
  );
});

test("sends metadata only for titles the watch does not know", () => {
  const args = createUpsertPlaylistArgs(
    linked({autoDownload: true}),
    {title: "Mix", videoIds: ["a", "new"]},
    4,
    [
      {id: "a", title: "Alpha"},
      {
        id: "new",
        title: "Fresh",
        durationMillis: 1500.4,
        coverUrl: "file:///local.png",
      },
    ],
    parseWatchLibrarySnapshot(snapshot()),
  );
  assert.deepEqual(args, {
    id: "LC-1",
    title: "Mix",
    videoIds: ["a", "new"],
    videos: [{id: "new", title: "Fresh", durationMillis: 1500}],
    autoDownload: true,
    syncVersion: 4,
  });
});

test("parses playlist messages from the watch", () => {
  assert.deepEqual(
    parseWatchPlaylistChanged({
      type: "playlistChanged",
      id: "LC-1",
      title: "Mix",
      videoIds: ["a", 1],
      baseSyncVersion: 2,
    }),
    {id: "LC-1", title: "Mix", videoIds: ["a"], baseSyncVersion: 2},
  );
  assert.equal(parseWatchPlaylistChanged({type: "playlistChanged"}), null);
  assert.equal(
    parseWatchPlaylistDeleted({type: "playlistDeleted", id: "LC-1"}),
    "LC-1",
  );
});

test("persists linked playlists in the cache", () => {
  const cache = setLinkedPlaylist(
    createEmptyWatchLibraryCache(),
    linked({
      syncVersion: 2,
      sent: {title: "Mix", videoIds: ["a"]},
      pendingWatchChange: {title: "Mix", videoIds: [], baseSyncVersion: 2},
    }),
  );
  const json = JSON.stringify(cache);
  assert.equal(JSON.stringify(parseWatchLibraryCache(json)), json);
});

test("shows link status and linked playlists the watch has not reported", () => {
  const sent = {title: "Fresh", videoIds: ["x", "y"]};
  const viewModel = applyPendingCommands(
    parseWatchLibrarySnapshot(snapshot()),
    [],
    null,
    {
      PL1: linked({id: "PL1", syncVersion: 1, sent, ackedVersion: 1}),
      "LC-2": linked({id: "LC-2", syncVersion: 1, sent}),
    },
  );
  assert.deepEqual(
    viewModel.playlists.map(row => [row.id, row.linkStatus, row.videoCount]),
    [
      ["PL1", "synced", 2],
      ["LC-2", "waitingForWatch", 2],
    ],
  );
});

test("creates property-list metadata for a video file transfer", () => {
  assert.deepEqual(
    createVideoFileMetadata(
      "cmd-9",
      {
        id: "a",
        name: "Alpha",
        author: null,
        // Downloaded files store milliseconds.
        duration: 181500,
        coverUrl: "file:///covers/a.png",
        fileUrl: "a/audio.m4a",
      },
      "m4a",
    ),
    {
      type: "videoFile",
      protocolVersion: 1,
      commandId: "cmd-9",
      id: "a",
      title: "Alpha",
      durationMillis: 181500,
      fileExtension: "m4a",
    },
  );
  assert.equal(getFileExtension("a/video.mp4"), "mp4");
  assert.equal(getFileExtension("a/video"), undefined);
  assert.equal(getFileExtension(".hidden"), undefined);
});

test("prefers fresh live progress over the snapshot", () => {
  const base = parseWatchLibrarySnapshot(snapshot({generatedAt: 1000}));
  const live = {
    receivedAt: 2000,
    downloads: [
      {id: "b", progress: 0.9},
      {id: "c", progress: 0.1},
    ],
  };

  const updated = withLiveProgress(base, live, 3000);
  assert.deepEqual(updated.activeDownloads, live.downloads);
  // "c" started running, so it is no longer queued.
  assert.deepEqual(updated.pendingDownloads, []);

  assert.equal(withLiveProgress(base, live, 2000 + 6000), base);
  assert.equal(withLiveProgress(base, {...live, receivedAt: 500}, 600), base);
  assert.equal(withLiveProgress(base, null, 3000), base);
});

test("parses live download progress from the watch", () => {
  assert.deepEqual(
    parseWatchDownloadProgress({
      type: "downloadProgress",
      downloads: [{id: "a", progress: 0.5}, {progress: 1}],
    }),
    [{id: "a", progress: 0.5}],
  );
  assert.equal(parseWatchDownloadProgress({type: "other"}), null);
});

test("lists phone uploads before downloads on the watch", () => {
  const rows = buildWatchTransferRows(
    [
      {
        uri: "file:///a.mp4",
        process: 0.25,
        transferring: true,
        paused: false,
        metadata: {type: "videoFile", id: "a"},
      },
      {
        uri: "file:///snapshot.json",
        process: 0,
        transferring: true,
        paused: false,
        metadata: {type: "librarySnapshot"},
      },
    ],
    parseWatchLibrarySnapshot(snapshot()),
  );
  assert.deepEqual(rows, [
    {
      kind: "upload",
      key: "upload-file:///a.mp4",
      id: "a",
      title: "Alpha",
      progress: 0.25,
      paused: false,
    },
    {
      kind: "watchDownload",
      key: "watch-b",
      id: "b",
      title: "Beta",
      progress: 0.4,
    },
    {kind: "watchDownload", key: "watch-c", id: "c", title: "Gamma"},
  ]);
});

test("splits missing titles by availability on the phone", () => {
  assert.deepEqual(splitByPhoneAvailability(["a", "b", "c"], new Set(["b"])), {
    transfer: ["b"],
    download: ["a", "c"],
  });
});

test("shows pending file transfers as queued rows", () => {
  const viewModel = applyPendingCommands(
    parseWatchLibrarySnapshot(snapshot()),
    [
      {
        command: createWatchLibraryCommand(
          "transferVideo",
          {videoIds: ["new"]},
          "t1",
          1,
        ),
        state: "pending",
        sentAt: 1,
      },
    ],
  );
  const row = viewModel.downloads.find(item => item.id === "new");
  assert.equal(row?.state, "queued");
  assert.equal(row?.pendingOp, "transferVideo");
});

test("reads stored durations in the unit of their record", () => {
  // A downloaded 3 minute song must not become 50 hours on the watch.
  assert.equal(
    getStoredDurationMillis({duration: 180000, fileUrl: "a/audio.m4a"}),
    180000,
  );
  assert.equal(getStoredDurationMillis({duration: 180, fileUrl: null}), 180000);
  assert.equal(
    getStoredDurationMillis({duration: 0, fileUrl: null}),
    undefined,
  );
  assert.equal(getStoredDurationMillis({duration: null}), undefined);
});

test("sends downloaded covers as files and keeps remote ones as URLs", () => {
  assert.equal(getLocalCoverPath({coverUrl: "a/cover.jpg"}), "a/cover.jpg");
  assert.equal(
    getLocalCoverPath({coverUrl: "https://i.ytimg.com/vi/a/hq.jpg"}),
    undefined,
  );
  assert.equal(getLocalCoverPath({coverUrl: "file:///x.jpg"}), undefined);
  assert.equal(getLocalCoverPath({coverUrl: null}), undefined);
  assert.deepEqual(createVideoCoverMetadata("a", "jpg"), {
    type: "videoCover",
    protocolVersion: 1,
    id: "a",
    fileExtension: "jpg",
  });
});

test("does not list cover transfers as uploads", () => {
  const rows = buildWatchTransferRows(
    [
      {
        uri: "file:///cover.jpg",
        process: 0.5,
        transferring: true,
        paused: false,
        metadata: {type: "videoCover", id: "a"},
      },
    ],
    null,
  );
  assert.deepEqual(rows, []);
});

const sortRows = [
  {id: "q", title: "Queued", state: "queued"},
  {
    id: "z",
    title: "zebra",
    state: "downloaded",
    sizeBytes: 10,
    downloadedAt: 300,
  },
  {
    id: "a",
    title: "Apple",
    state: "downloaded",
    sizeBytes: 30,
    downloadedAt: 100,
  },
  {id: "n", title: "Ärger", state: "downloaded"},
  {id: "d", title: "Track 10", state: "downloading", progress: 0.5},
  {
    id: "t",
    title: "Track 9",
    state: "downloaded",
    sizeBytes: 30,
    downloadedAt: 200,
  },
];
const ids = rows => rows.map(row => row.id);

test("keeps running downloads on top and sorts finished ones", () => {
  assert.deepEqual(ids(sortWatchLibraryDownloads(sortRows, "name", "de")), [
    "q",
    "d",
    "a",
    "n",
    "t",
    "z",
  ]);
  // Equal sizes fall back to the name, missing sizes go last.
  assert.deepEqual(ids(sortWatchLibraryDownloads(sortRows, "size", "en")), [
    "q",
    "d",
    "a",
    "t",
    "z",
    "n",
  ]);
  assert.deepEqual(ids(sortWatchLibraryDownloads(sortRows, "added", "en")), [
    "q",
    "d",
    "z",
    "t",
    "a",
    "n",
  ]);
});

test("sorts titles naturally so 9 comes before 10", () => {
  const rows = [
    {id: "10", title: "Track 10", state: "downloaded"},
    {id: "9", title: "Track 9", state: "downloaded"},
  ];
  assert.deepEqual(ids(sortWatchLibraryDownloads(rows, "name", "en")), [
    "9",
    "10",
  ]);
});

test("falls back to date added for unknown sort settings", () => {
  assert.equal(normalizeWatchLibraryDownloadSort("size"), "size");
  assert.equal(normalizeWatchLibraryDownloadSort("bogus"), "added");
  assert.equal(normalizeWatchLibraryDownloadSort(undefined), "added");
});

test("deletes finished and cancels running titles of a selection", () => {
  assert.deepEqual(
    planSelectionRemoval(sortRows, new Set(["a", "d", "q", "missing"])),
    {deleteIds: ["a"], cancelIds: ["q", "d"]},
  );
});

test("reads the download date from the snapshot", () => {
  const parsed = parseWatchLibrarySnapshot(
    snapshot({
      videos: [
        {
          id: "a",
          title: "Alpha",
          durationMillis: 1,
          downloaded: true,
          downloadedAt: 1234,
        },
      ],
      activeDownloads: [],
      pendingDownloads: [],
      playlists: [],
    }),
  );
  assert.equal(
    buildWatchLibraryViewModel(parsed).downloads[0].downloadedAt,
    1234,
  );
});
