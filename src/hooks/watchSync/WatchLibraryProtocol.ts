/**
 * Wire format and pure helpers for managing the Apple Watch library from the
 * phone. Must stay in sync with targets/watch/WatchLibraryProtocol.swift.
 *
 * The watch is the source of truth for its library. The phone only caches the
 * latest snapshot and sends commands. Everything coming from the watch is
 * validated here because an older or newer watch app may send other shapes.
 */

export const WATCH_LIBRARY_PROTOCOL_VERSION = 1;

export const WATCH_LIBRARY_SNAPSHOT_TYPE = "librarySnapshot";
export const WATCH_LIBRARY_COMMAND_TYPE = "libraryCommand";
export const WATCH_LIBRARY_COMMAND_RESULT_TYPE = "libraryCommandResult";
/** Key of the short status inside the watch -> phone application context. */
export const WATCH_LIBRARY_STATUS_CONTEXT_KEY = "libraryStatus";

export const WATCH_LIBRARY_CACHE_VERSION = 1;

export interface WatchLibraryStorage {
  /** Bytes used by downloaded media of the watch app. */
  usedBytes: number;
  /** Free bytes on the watch volume. */
  availableBytes: number;
}

export interface WatchLibraryVideo {
  id: string;
  title?: string;
  artist?: string;
  durationMillis: number;
  downloaded: boolean;
  sizeBytes?: number;
  coverUrl?: string;
}

export interface WatchLibraryPlaylist {
  id: string;
  title?: string;
  videoIds: string[];
  autoDownload: boolean;
  temp: boolean;
  linked: boolean;
  syncVersion: number;
}

export interface WatchLibraryActiveDownload {
  id: string;
  /** Fraction between 0 and 1. */
  progress: number;
}

export interface WatchLibrarySnapshot {
  protocolVersion: number;
  revision: number;
  /** Milliseconds since 1970, watch clock. */
  generatedAt: number;
  storage: WatchLibraryStorage;
  videos: WatchLibraryVideo[];
  playlists: WatchLibraryPlaylist[];
  activeDownloads: WatchLibraryActiveDownload[];
  pendingDownloads: string[];
}

export interface WatchLibraryStatus {
  revision: number;
  usedBytes: number;
  availableBytes: number;
  downloadedCount: number;
}

export type WatchLibraryCommandOp =
  | "requestSnapshot"
  | "downloadVideos"
  | "cancelDownloads"
  | "deleteDownload"
  | "removeVideos"
  | "upsertPlaylist"
  | "deletePlaylist"
  | "setPlaylistAutoDownload"
  | "clearAllDownloads";

const WATCH_LIBRARY_COMMAND_OPS: readonly WatchLibraryCommandOp[] = [
  "requestSnapshot",
  "downloadVideos",
  "cancelDownloads",
  "deleteDownload",
  "removeVideos",
  "upsertPlaylist",
  "deletePlaylist",
  "setPlaylistAutoDownload",
  "clearAllDownloads",
];

export interface WatchLibraryCommand {
  type: typeof WATCH_LIBRARY_COMMAND_TYPE;
  protocolVersion: number;
  commandId: string;
  issuedAt: number;
  op: WatchLibraryCommandOp;
  args: Record<string, unknown>;
}

export interface WatchLibraryCommandResult {
  commandId: string;
  status: "ok" | "failed" | "unsupported";
  error?: string;
  revision: number;
}

/**
 * - `pending`: sent, the watch has not acknowledged it yet.
 * - `applied`: acknowledged, but no snapshot containing the change has arrived.
 * - `failed`: the watch rejected it or the transfer failed.
 */
export type WatchLibraryPendingState = "pending" | "applied" | "failed";

export interface WatchLibraryPendingCommand {
  command: WatchLibraryCommand;
  state: WatchLibraryPendingState;
  /** Phone time (ms) of the last send. */
  sentAt: number;
  /** Revision containing the change, known once acknowledged. */
  revision?: number;
  error?: string;
  /** Set if the watch app does not know the operation (outdated watch app). */
  unsupported?: boolean;
}

/** After this long without an acknowledgement the UI suggests opening the watch app. */
export const WATCH_LIBRARY_COMMAND_STALE_MS = 30 * 60 * 1000;

/** Everything the phone persists about the watch library, replaced as a whole. */
export interface WatchLibraryCache {
  cacheVersion: number;
  snapshot: WatchLibrarySnapshot | null;
  status: WatchLibraryStatus | null;
  /** Phone time (ms) at which the last snapshot was received. */
  lastSyncAt: number | null;
  /** Commands not yet reflected by a snapshot, oldest first. */
  pendingCommands: WatchLibraryPendingCommand[];
}

// Parsing helpers

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function parseList<T>(value: unknown, parse: (item: unknown) => T | null) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map(parse).filter((item): item is T => item !== null);
}

function parseVideo(value: unknown): WatchLibraryVideo | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = nonEmptyString(value.id);
  if (!id) {
    return null;
  }
  return {
    id,
    title: optionalString(value.title),
    artist: optionalString(value.artist),
    durationMillis: Math.max(0, finiteNumber(value.durationMillis) ?? 0),
    downloaded: value.downloaded === true,
    sizeBytes: finiteNumber(value.sizeBytes),
    coverUrl: nonEmptyString(value.coverUrl),
  };
}

function parsePlaylist(value: unknown): WatchLibraryPlaylist | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = nonEmptyString(value.id);
  if (!id) {
    return null;
  }
  return {
    id,
    title: optionalString(value.title),
    videoIds: stringList(value.videoIds),
    autoDownload: value.autoDownload === true,
    temp: value.temp === true,
    linked: value.linked === true,
    syncVersion: finiteNumber(value.syncVersion) ?? 0,
  };
}

function parseActiveDownload(
  value: unknown,
): WatchLibraryActiveDownload | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = nonEmptyString(value.id);
  if (!id) {
    return null;
  }
  const progress = finiteNumber(value.progress) ?? 0;
  return {id, progress: Math.min(1, Math.max(0, progress))};
}

/**
 * Validates a snapshot sent by the watch. Returns null if the required envelope
 * is missing; malformed entries inside the lists are dropped individually.
 */
export function parseWatchLibrarySnapshot(
  value: unknown,
): WatchLibrarySnapshot | null {
  if (!isRecord(value)) {
    return null;
  }
  const protocolVersion = finiteNumber(value.protocolVersion);
  const revision = finiteNumber(value.revision);
  if (protocolVersion === undefined || revision === undefined) {
    return null;
  }
  const storage = isRecord(value.storage) ? value.storage : {};
  return {
    protocolVersion,
    revision,
    generatedAt: finiteNumber(value.generatedAt) ?? 0,
    storage: {
      usedBytes: Math.max(0, finiteNumber(storage.usedBytes) ?? 0),
      availableBytes: Math.max(0, finiteNumber(storage.availableBytes) ?? 0),
    },
    videos: parseList(value.videos, parseVideo),
    playlists: parseList(value.playlists, parsePlaylist),
    activeDownloads: parseList(value.activeDownloads, parseActiveDownload),
    pendingDownloads: stringList(value.pendingDownloads),
  };
}

/** Parses a snapshot from its JSON text (inline message or transferred file). */
export function parseWatchLibrarySnapshotJSON(
  json: string,
): WatchLibrarySnapshot | null {
  try {
    return parseWatchLibrarySnapshot(JSON.parse(json));
  } catch {
    return null;
  }
}

/** Reads the short status from the application context received from the watch. */
export function parseWatchLibraryStatus(
  context: unknown,
): WatchLibraryStatus | null {
  if (!isRecord(context)) {
    return null;
  }
  const status = context[WATCH_LIBRARY_STATUS_CONTEXT_KEY];
  if (!isRecord(status)) {
    return null;
  }
  const revision = finiteNumber(status.revision);
  if (revision === undefined) {
    return null;
  }
  return {
    revision,
    usedBytes: Math.max(0, finiteNumber(status.usedBytes) ?? 0),
    availableBytes: Math.max(0, finiteNumber(status.availableBytes) ?? 0),
    downloadedCount: Math.max(0, finiteNumber(status.downloadedCount) ?? 0),
  };
}

export function parseWatchLibraryCommandResult(
  message: unknown,
): WatchLibraryCommandResult | null {
  if (
    !isRecord(message) ||
    message.type !== WATCH_LIBRARY_COMMAND_RESULT_TYPE
  ) {
    return null;
  }
  const commandId = nonEmptyString(message.commandId);
  const status = message.status;
  if (
    !commandId ||
    (status !== "ok" && status !== "failed" && status !== "unsupported")
  ) {
    return null;
  }
  return {
    commandId,
    status,
    error: optionalString(message.error),
    revision: finiteNumber(message.revision) ?? 0,
  };
}

export function createEmptyWatchLibraryCache(): WatchLibraryCache {
  return {
    cacheVersion: WATCH_LIBRARY_CACHE_VERSION,
    snapshot: null,
    status: null,
    lastSyncAt: null,
    pendingCommands: [],
  };
}

function parseCommand(value: unknown): WatchLibraryCommand | null {
  if (!isRecord(value) || value.type !== WATCH_LIBRARY_COMMAND_TYPE) {
    return null;
  }
  const commandId = nonEmptyString(value.commandId);
  const op = WATCH_LIBRARY_COMMAND_OPS.find(item => item === value.op);
  if (!commandId || !op) {
    return null;
  }
  return {
    type: WATCH_LIBRARY_COMMAND_TYPE,
    protocolVersion:
      finiteNumber(value.protocolVersion) ?? WATCH_LIBRARY_PROTOCOL_VERSION,
    commandId,
    issuedAt: finiteNumber(value.issuedAt) ?? 0,
    op,
    args: isRecord(value.args) ? value.args : {},
  };
}

function parsePendingCommand(
  value: unknown,
): WatchLibraryPendingCommand | null {
  if (!isRecord(value)) {
    return null;
  }
  const command = parseCommand(value.command);
  const state = value.state;
  if (
    !command ||
    (state !== "pending" && state !== "applied" && state !== "failed")
  ) {
    return null;
  }
  return {
    command,
    state,
    sentAt: finiteNumber(value.sentAt) ?? command.issuedAt,
    revision: finiteNumber(value.revision),
    error: optionalString(value.error),
    unsupported: value.unsupported === true ? true : undefined,
  };
}

/** Restores the persisted cache; anything unreadable falls back to empty. */
export function parseWatchLibraryCache(json: string): WatchLibraryCache {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return createEmptyWatchLibraryCache();
  }
  if (!isRecord(value) || value.cacheVersion !== WATCH_LIBRARY_CACHE_VERSION) {
    return createEmptyWatchLibraryCache();
  }
  return {
    cacheVersion: WATCH_LIBRARY_CACHE_VERSION,
    snapshot: parseWatchLibrarySnapshot(value.snapshot),
    status: parseWatchLibraryStatus({
      [WATCH_LIBRARY_STATUS_CONTEXT_KEY]: value.status,
    }),
    lastSyncAt: finiteNumber(value.lastSyncAt) ?? null,
    pendingCommands: parseList(value.pendingCommands, parsePendingCommand),
  };
}

function isContainedIn(
  pending: WatchLibraryPendingCommand,
  snapshot: WatchLibrarySnapshot,
) {
  return (
    pending.state === "applied" &&
    pending.revision !== undefined &&
    pending.revision <= snapshot.revision
  );
}

/**
 * Stores a newly received snapshot unless a newer one is cached. Acknowledged
 * commands disappear once a snapshot contains their revision.
 */
export function applyWatchLibrarySnapshot(
  cache: WatchLibraryCache,
  snapshot: WatchLibrarySnapshot,
  receivedAt: number,
): WatchLibraryCache {
  if (cache.snapshot && cache.snapshot.revision > snapshot.revision) {
    return cache;
  }
  return {
    ...cache,
    snapshot,
    lastSyncAt: receivedAt,
    pendingCommands: cache.pendingCommands.filter(
      pending => !isContainedIn(pending, snapshot),
    ),
  };
}

export function addWatchLibraryPendingCommand(
  cache: WatchLibraryCache,
  command: WatchLibraryCommand,
  sentAt: number,
): WatchLibraryCache {
  return {
    ...cache,
    pendingCommands: [
      ...cache.pendingCommands,
      {command, state: "pending", sentAt},
    ],
  };
}

function updatePendingCommand(
  cache: WatchLibraryCache,
  commandId: string,
  update: (
    pending: WatchLibraryPendingCommand,
  ) => WatchLibraryPendingCommand | null,
): WatchLibraryCache {
  const index = cache.pendingCommands.findIndex(
    pending => pending.command.commandId === commandId,
  );
  if (index < 0) {
    return cache;
  }
  const updated = update(cache.pendingCommands[index]);
  const pendingCommands = [...cache.pendingCommands];
  if (updated) {
    pendingCommands[index] = updated;
  } else {
    pendingCommands.splice(index, 1);
  }
  return {...cache, pendingCommands};
}

/** Applies an acknowledgement from the watch. Unknown command ids are ignored. */
export function applyWatchLibraryCommandResult(
  cache: WatchLibraryCache,
  result: WatchLibraryCommandResult,
): WatchLibraryCache {
  return updatePendingCommand(cache, result.commandId, pending => {
    if (result.status !== "ok") {
      return {
        ...pending,
        state: "failed",
        error: result.error,
        unsupported: result.status === "unsupported" ? true : undefined,
      };
    }
    const applied: WatchLibraryPendingCommand = {
      ...pending,
      state: "applied",
      revision: result.revision,
      error: undefined,
      unsupported: undefined,
    };
    return cache.snapshot && isContainedIn(applied, cache.snapshot)
      ? null
      : applied;
  });
}

/** Marks a command whose WatchConnectivity transfer failed. */
export function markWatchLibraryCommandFailed(
  cache: WatchLibraryCache,
  commandId: string,
  error: string,
): WatchLibraryCache {
  return updatePendingCommand(cache, commandId, pending =>
    pending.state === "applied"
      ? pending
      : {...pending, state: "failed", error},
  );
}

/**
 * Replaces a command by a resent copy. A new command id is required because the
 * watch answers known ids with the stored result instead of executing again.
 */
export function resendWatchLibraryPendingCommand(
  cache: WatchLibraryCache,
  commandId: string,
  newCommandId: string,
  sentAt: number,
): WatchLibraryCache {
  return updatePendingCommand(cache, commandId, pending => ({
    command: {...pending.command, commandId: newCommandId, issuedAt: sentAt},
    state: "pending",
    sentAt,
  }));
}

export function discardWatchLibraryPendingCommand(
  cache: WatchLibraryCache,
  commandId: string,
): WatchLibraryCache {
  return updatePendingCommand(cache, commandId, () => null);
}

export function isWatchLibraryCommandStale(
  pending: WatchLibraryPendingCommand,
  now: number,
): boolean {
  return (
    pending.state === "pending" &&
    now - pending.sentAt >= WATCH_LIBRARY_COMMAND_STALE_MS
  );
}

/**
 * Arguments for `downloadVideos`. Known metadata is sent along so the watch can
 * show the titles before it fetched stream data. Undefined values are omitted
 * because WatchConnectivity only accepts property-list values.
 */
export function createDownloadVideosArgs(
  videoIds: readonly string[],
  snapshot: WatchLibrarySnapshot | null,
): Record<string, unknown> {
  const videosById = new Map(
    (snapshot?.videos ?? []).map(video => [video.id, video]),
  );
  const videos = videoIds.flatMap(id => {
    const video = videosById.get(id);
    if (!video) {
      return [];
    }
    const entry: Record<string, string | number> = {
      id,
      durationMillis: video.durationMillis,
    };
    if (video.title !== undefined) {
      entry.title = video.title;
    }
    if (video.artist !== undefined) {
      entry.artist = video.artist;
    }
    if (video.coverUrl !== undefined) {
      entry.coverUrl = video.coverUrl;
    }
    return [entry];
  });
  return {videoIds: [...videoIds], videos};
}

/** Video ids a command refers to; empty for library-wide commands. */
export function getWatchLibraryCommandVideoIds(
  command: WatchLibraryCommand,
): string[] {
  return stringList(command.args.videoIds);
}

/** True if the watch reports a library state the cached snapshot does not cover. */
export function isWatchLibrarySnapshotOutdated(
  snapshot: WatchLibrarySnapshot | null,
  status: WatchLibraryStatus | null,
): boolean {
  if (!snapshot) {
    return true;
  }
  return status !== null && status.revision > snapshot.revision;
}

export function createWatchLibraryCommand(
  op: WatchLibraryCommandOp,
  args: Record<string, unknown>,
  commandId: string,
  issuedAt: number,
): WatchLibraryCommand {
  return {
    type: WATCH_LIBRARY_COMMAND_TYPE,
    protocolVersion: WATCH_LIBRARY_PROTOCOL_VERSION,
    commandId,
    issuedAt,
    op,
    args,
  };
}

// View model

export type WatchLibraryDownloadState = "downloaded" | "downloading" | "queued";

export interface WatchLibraryDownloadRow {
  id: string;
  title?: string;
  artist?: string;
  state: WatchLibraryDownloadState;
  sizeBytes?: number;
  progress?: number;
  /** Latest not yet confirmed command affecting this row. */
  pendingOp?: WatchLibraryCommandOp;
}

export interface WatchLibraryPlaylistRow {
  id: string;
  title?: string;
  videoCount: number;
  downloadedCount: number;
  autoDownload: boolean;
}

export interface WatchLibraryStorageSummary {
  usedBytes: number;
  availableBytes: number;
  /** Share of the watch storage used by downloads, between 0 and 1. */
  usedFraction: number;
}

export interface WatchLibraryViewModel {
  storage: WatchLibraryStorageSummary;
  downloads: WatchLibraryDownloadRow[];
  playlists: WatchLibraryPlaylistRow[];
}

const DOWNLOAD_STATE_ORDER: Record<WatchLibraryDownloadState, number> = {
  downloading: 0,
  queued: 1,
  downloaded: 2,
};

function compareDownloadRows(
  a: WatchLibraryDownloadRow,
  b: WatchLibraryDownloadRow,
) {
  const order = DOWNLOAD_STATE_ORDER[a.state] - DOWNLOAD_STATE_ORDER[b.state];
  if (order !== 0) {
    return order;
  }
  return (a.title ?? a.id).localeCompare(b.title ?? b.id);
}

/**
 * Builds the rows shown on the phone. Running and queued downloads come first,
 * temporary home feed playlists are hidden.
 */
export function buildWatchLibraryViewModel(
  snapshot: WatchLibrarySnapshot,
  status: WatchLibraryStatus | null = null,
): WatchLibraryViewModel {
  return applyPendingCommands(snapshot, [], status);
}

function metadataVideo(
  command: WatchLibraryCommand,
  id: string,
): {title?: string; artist?: string} {
  const videos = Array.isArray(command.args.videos) ? command.args.videos : [];
  const entry = videos.find(
    (video): video is UnknownRecord => isRecord(video) && video.id === id,
  );
  return {
    title: optionalString(entry?.title),
    artist: optionalString(entry?.artist),
  };
}

/**
 * Optimistic view: lays commands that are not confirmed by a snapshot yet over
 * the snapshot, so the phone reacts immediately while the watch may be asleep.
 * Affected rows are marked instead of removed, so the pending change stays visible.
 * Failed commands are not applied.
 */
export function applyPendingCommands(
  snapshot: WatchLibrarySnapshot,
  pendingCommands: readonly WatchLibraryPendingCommand[],
  status: WatchLibraryStatus | null = null,
): WatchLibraryViewModel {
  const videosById = new Map(snapshot.videos.map(video => [video.id, video]));
  const progressById = new Map(
    snapshot.activeDownloads.map(download => [download.id, download.progress]),
  );
  const pendingIds = new Set(snapshot.pendingDownloads);

  const downloadIds = new Set<string>([
    ...progressById.keys(),
    ...pendingIds,
    ...snapshot.videos.filter(video => video.downloaded).map(video => video.id),
  ]);

  const downloads = [...downloadIds].map((id): WatchLibraryDownloadRow => {
    const video = videosById.get(id);
    const progress = progressById.get(id);
    const state: WatchLibraryDownloadState =
      progress !== undefined
        ? "downloading"
        : video?.downloaded
          ? "downloaded"
          : "queued";
    return {
      id,
      title: video?.title,
      artist: video?.artist,
      state,
      sizeBytes: state === "downloaded" ? video?.sizeBytes : undefined,
      progress: state === "downloading" ? progress : undefined,
    };
  });

  const rowsById = new Map(downloads.map(row => [row.id, row]));
  for (const pending of pendingCommands) {
    if (pending.state === "failed") {
      continue;
    }
    const {command} = pending;
    if (command.op === "clearAllDownloads") {
      rowsById.forEach(row => {
        row.pendingOp = command.op;
      });
      continue;
    }
    for (const id of getWatchLibraryCommandVideoIds(command)) {
      const row = rowsById.get(id);
      if (command.op === "downloadVideos") {
        if (!row) {
          const video = videosById.get(id);
          const metadata = metadataVideo(command, id);
          const added: WatchLibraryDownloadRow = {
            id,
            title: video?.title ?? metadata.title,
            artist: video?.artist ?? metadata.artist,
            state: "queued",
            pendingOp: command.op,
          };
          rowsById.set(id, added);
          downloads.push(added);
        } else if (row.state !== "downloaded") {
          row.pendingOp = command.op;
        }
      } else if (
        row &&
        (command.op === "deleteDownload" ||
          command.op === "removeVideos" ||
          command.op === "cancelDownloads")
      ) {
        row.pendingOp = command.op;
      }
    }
  }

  downloads.sort(compareDownloadRows);

  const playlists = snapshot.playlists
    .filter(playlist => !playlist.temp)
    .map(
      (playlist): WatchLibraryPlaylistRow => ({
        id: playlist.id,
        title: playlist.title,
        videoCount: playlist.videoIds.length,
        downloadedCount: playlist.videoIds.filter(
          id => videosById.get(id)?.downloaded,
        ).length,
        autoDownload: playlist.autoDownload,
      }),
    );

  // The short status is newer than the snapshot whenever its revision is.
  const storageSource =
    status && status.revision > snapshot.revision ? status : snapshot.storage;
  const total = storageSource.usedBytes + storageSource.availableBytes;

  return {
    storage: {
      usedBytes: storageSource.usedBytes,
      availableBytes: storageSource.availableBytes,
      usedFraction: total > 0 ? storageSource.usedBytes / total : 0,
    },
    downloads,
    playlists,
  };
}

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

/** Formats a byte count with decimal units and locale-aware digits. */
export function formatByteSize(bytes: number, locale: string): string {
  let value = Math.max(0, bytes);
  let unitIndex = 0;
  while (value >= 1000 && unitIndex < BYTE_UNITS.length - 1) {
    value /= 1000;
    unitIndex += 1;
  }
  const formatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: unitIndex === 0 || value >= 100 ? 0 : 1,
  });
  return `${formatter.format(value)} ${BYTE_UNITS[unitIndex]}`;
}
