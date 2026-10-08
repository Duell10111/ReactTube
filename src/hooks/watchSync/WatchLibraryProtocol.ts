import {difference, mergePlaylist, sameOrder} from "./watchPlaylistMerge.ts";

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
export const WATCH_LIBRARY_PLAYLIST_CHANGED_TYPE = "playlistChanged";
export const WATCH_LIBRARY_PLAYLIST_DELETED_TYPE = "playlistDeleted";
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

export interface WatchPlaylistState {
  title: string;
  videoIds: string[];
}

/** A linked playlist edited on the watch, not yet applied on the phone. */
export interface WatchPlaylistChange extends WatchPlaylistState {
  /** syncVersion the watch had when the edit happened. */
  baseSyncVersion: number;
}

/**
 * Phone-side state of a playlist linked to the watch. The ids are the same on
 * both sides (local `LC-…` or YouTube playlists).
 */
export interface LinkedPlaylist {
  id: string;
  autoDownload: boolean;
  /** Version of the last `upsertPlaylist` sent to the watch. */
  syncVersion: number;
  /** State sent with `syncVersion`. */
  sent: WatchPlaylistState | null;
  /** Last state the watch acknowledged, and its version. */
  acked: WatchPlaylistState | null;
  ackedVersion: number;
  pendingWatchChange: WatchPlaylistChange | null;
  /** Developer diagnostic of the last failed sync step. */
  lastError?: string;
}

/** Everything the phone persists about the watch library, replaced as a whole. */
export interface WatchLibraryCache {
  cacheVersion: number;
  snapshot: WatchLibrarySnapshot | null;
  status: WatchLibraryStatus | null;
  /** Phone time (ms) at which the last snapshot was received. */
  lastSyncAt: number | null;
  /** Commands not yet reflected by a snapshot, oldest first. */
  pendingCommands: WatchLibraryPendingCommand[];
  linkedPlaylists: Record<string, LinkedPlaylist>;
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
    linkedPlaylists: {},
  };
}

function parsePlaylistState(value: unknown): WatchPlaylistState | null {
  if (!isRecord(value)) {
    return null;
  }
  return {
    title: optionalString(value.title) ?? "",
    videoIds: stringList(value.videoIds),
  };
}

function parseLinkedPlaylist(value: unknown): LinkedPlaylist | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = nonEmptyString(value.id);
  if (!id) {
    return null;
  }
  const change = isRecord(value.pendingWatchChange)
    ? value.pendingWatchChange
    : null;
  return {
    id,
    autoDownload: value.autoDownload === true,
    syncVersion: finiteNumber(value.syncVersion) ?? 0,
    sent: parsePlaylistState(value.sent),
    acked: parsePlaylistState(value.acked),
    ackedVersion: finiteNumber(value.ackedVersion) ?? 0,
    pendingWatchChange: change
      ? {
          title: optionalString(change.title) ?? "",
          videoIds: stringList(change.videoIds),
          baseSyncVersion: finiteNumber(change.baseSyncVersion) ?? 0,
        }
      : null,
    lastError: optionalString(value.lastError),
  };
}

function parseLinkedPlaylists(value: unknown): Record<string, LinkedPlaylist> {
  if (!isRecord(value)) {
    return {};
  }
  const result: Record<string, LinkedPlaylist> = {};
  Object.values(value).forEach(entry => {
    const link = parseLinkedPlaylist(entry);
    if (link) {
      result[link.id] = link;
    }
  });
  return result;
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
    linkedPlaylists: parseLinkedPlaylists(value.linkedPlaylists),
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
  const command = cache.pendingCommands.find(
    pending => pending.command.commandId === result.commandId,
  )?.command;
  if (command?.op === "upsertPlaylist" && result.status === "ok") {
    cache = acknowledgeLinkedPlaylist(cache, command);
  }
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
  /** Set for playlists linked to a phone playlist. */
  linkStatus?: LinkedPlaylistStatus;
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
  linkedPlaylists: Readonly<Record<string, LinkedPlaylist>> = {},
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
        autoDownload:
          linkedPlaylists[playlist.id]?.autoDownload ?? playlist.autoDownload,
        ...(linkedPlaylists[playlist.id]
          ? {
              linkStatus: getLinkedPlaylistStatus(
                linkedPlaylists[playlist.id],
                pendingCommands,
              ),
            }
          : {}),
      }),
    );
  // Linked playlists the watch has not reported yet.
  const listed = new Set(playlists.map(row => row.id));
  Object.values(linkedPlaylists)
    .filter(link => !listed.has(link.id))
    .forEach(link =>
      playlists.push({
        id: link.id,
        title: link.sent?.title,
        videoCount: link.sent?.videoIds.length ?? 0,
        downloadedCount: 0,
        autoDownload: link.autoDownload,
        linkStatus: getLinkedPlaylistStatus(link, pendingCommands),
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

// Linked playlists

export function parseWatchPlaylistChanged(
  message: unknown,
): ({id: string} & WatchPlaylistChange) | null {
  if (
    !isRecord(message) ||
    message.type !== WATCH_LIBRARY_PLAYLIST_CHANGED_TYPE
  ) {
    return null;
  }
  const id = nonEmptyString(message.id);
  if (!id || !Array.isArray(message.videoIds)) {
    return null;
  }
  return {
    id,
    title: optionalString(message.title) ?? "",
    videoIds: stringList(message.videoIds),
    baseSyncVersion: finiteNumber(message.baseSyncVersion) ?? 0,
  };
}

export function parseWatchPlaylistDeleted(message: unknown): string | null {
  if (
    !isRecord(message) ||
    message.type !== WATCH_LIBRARY_PLAYLIST_DELETED_TYPE
  ) {
    return null;
  }
  return nonEmptyString(message.id) ?? null;
}

export function createLinkedPlaylist(
  id: string,
  autoDownload: boolean,
): LinkedPlaylist {
  return {
    id,
    autoDownload,
    syncVersion: 0,
    sent: null,
    acked: null,
    ackedVersion: 0,
    pendingWatchChange: null,
  };
}

export function setLinkedPlaylist(
  cache: WatchLibraryCache,
  link: LinkedPlaylist,
): WatchLibraryCache {
  return {
    ...cache,
    linkedPlaylists: {...cache.linkedPlaylists, [link.id]: link},
  };
}

function isPlaylistCommandFor(command: WatchLibraryCommand, id: string) {
  return (
    (command.op === "upsertPlaylist" ||
      command.op === "setPlaylistAutoDownload") &&
    command.args.id === id
  );
}

/**
 * Ends a link on the phone. Unconfirmed playlist commands for it are dropped;
 * WatchConnectivity still delivers them, but nobody waits for them anymore.
 */
export function removeLinkedPlaylist(
  cache: WatchLibraryCache,
  id: string,
): WatchLibraryCache {
  const linkedPlaylists = {...cache.linkedPlaylists};
  delete linkedPlaylists[id];
  return {
    ...cache,
    linkedPlaylists,
    pendingCommands: cache.pendingCommands.filter(
      pending => !isPlaylistCommandFor(pending.command, id),
    ),
  };
}

/** Records a watch edit; a newer full list replaces an older unapplied one. */
export function applyWatchPlaylistChange(
  cache: WatchLibraryCache,
  change: {id: string} & WatchPlaylistChange,
): WatchLibraryCache {
  const link = cache.linkedPlaylists[change.id];
  if (!link) {
    return cache;
  }
  const previous = link.pendingWatchChange;
  return setLinkedPlaylist(cache, {
    ...link,
    pendingWatchChange: {
      title: change.title,
      videoIds: change.videoIds,
      // Keep the oldest base so edits of the unapplied change are not lost.
      baseSyncVersion: previous
        ? Math.min(previous.baseSyncVersion, change.baseSyncVersion)
        : change.baseSyncVersion,
    },
  });
}

function acknowledgeLinkedPlaylist(
  cache: WatchLibraryCache,
  command: WatchLibraryCommand,
): WatchLibraryCache {
  const id = optionalString(command.args.id);
  const link = id ? cache.linkedPlaylists[id] : undefined;
  const version = finiteNumber(command.args.syncVersion);
  if (!link || version === undefined || version < link.ackedVersion) {
    return cache;
  }
  return setLinkedPlaylist(cache, {
    ...link,
    acked: {
      title: optionalString(command.args.title) ?? "",
      videoIds: stringList(command.args.videoIds),
    },
    ackedVersion: version,
  });
}

/** The last state both sides agreed on, as seen by a watch edit. */
function baseForWatchChange(link: LinkedPlaylist, baseSyncVersion: number) {
  if (baseSyncVersion >= link.syncVersion && link.sent) {
    return link.sent;
  }
  return link.acked ?? link.sent ?? {title: "", videoIds: []};
}

export interface LinkedPlaylistSyncPlan {
  /** State both sides should end up with. */
  desired: WatchPlaylistState;
  /** Edits to apply to the phone playlist first, if the watch changed it. */
  phoneUpdate: {add: string[]; remove: string[]; reorder: boolean} | null;
  /** True if the watch has to receive `desired`. */
  sendToWatch: boolean;
}

/**
 * Decides what a sync of one linked playlist has to do, given the current
 * phone playlist. Titles always follow the phone.
 */
export function planLinkedPlaylistSync(
  link: LinkedPlaylist,
  phone: WatchPlaylistState,
): LinkedPlaylistSyncPlan {
  let desired: WatchPlaylistState = {
    title: phone.title,
    videoIds: [...new Set(phone.videoIds)],
  };
  let phoneUpdate: LinkedPlaylistSyncPlan["phoneUpdate"] = null;

  const change = link.pendingWatchChange;
  if (change) {
    const base = baseForWatchChange(link, change.baseSyncVersion);
    const merged = mergePlaylist(
      base.videoIds,
      desired.videoIds,
      change.videoIds,
    );
    const add = difference(merged, desired.videoIds);
    const remove = difference(desired.videoIds, merged);
    const remaining = desired.videoIds.filter(id => !remove.includes(id));
    const reorder = !sameOrder([...remaining, ...add], merged);
    if (add.length > 0 || remove.length > 0 || reorder) {
      phoneUpdate = {add, remove, reorder};
    }
    desired = {title: phone.title, videoIds: merged};
  }

  const sendToWatch =
    !link.sent ||
    link.sent.title !== desired.title ||
    !sameOrder(link.sent.videoIds, desired.videoIds);

  return {desired, phoneUpdate, sendToWatch};
}

export interface LinkedPlaylistVideo {
  id: string;
  title?: string;
  artist?: string;
  durationMillis?: number;
  coverUrl?: string;
}

/**
 * Arguments for `upsertPlaylist`. Metadata is only sent for titles the watch
 * does not know yet, which keeps large playlists small on the wire.
 */
export function createUpsertPlaylistArgs(
  link: LinkedPlaylist,
  state: WatchPlaylistState,
  syncVersion: number,
  videos: readonly LinkedPlaylistVideo[],
  snapshot: WatchLibrarySnapshot | null,
): Record<string, unknown> {
  const known = new Set((snapshot?.videos ?? []).map(video => video.id));
  const wanted = new Set(state.videoIds);
  const metadata = videos
    .filter(video => wanted.has(video.id) && !known.has(video.id))
    .map(video => {
      const entry: Record<string, string | number> = {id: video.id};
      if (video.title !== undefined) {
        entry.title = video.title;
      }
      if (video.artist !== undefined) {
        entry.artist = video.artist;
      }
      if (video.durationMillis !== undefined) {
        entry.durationMillis = Math.round(video.durationMillis);
      }
      if (video.coverUrl && /^https?:\/\//.test(video.coverUrl)) {
        entry.coverUrl = video.coverUrl;
      }
      return entry;
    });
  return {
    id: link.id,
    title: state.title,
    videoIds: [...state.videoIds],
    videos: metadata,
    autoDownload: link.autoDownload,
    syncVersion,
  };
}

export type LinkedPlaylistStatus =
  | "synced"
  | "waitingForWatch"
  | "waitingForPhone"
  | "failed";

/**
 * Sync status shown on the phone. `waitingForPhone` means a watch edit could
 * not be applied to the phone playlist yet (e.g. YouTube was unreachable).
 */
export function getLinkedPlaylistStatus(
  link: LinkedPlaylist,
  pendingCommands: readonly WatchLibraryPendingCommand[],
): LinkedPlaylistStatus {
  if (link.pendingWatchChange) {
    return "waitingForPhone";
  }
  const commands = pendingCommands.filter(pending =>
    isPlaylistCommandFor(pending.command, link.id),
  );
  if (commands.some(pending => pending.state === "failed")) {
    return "failed";
  }
  if (
    commands.some(pending => pending.state === "pending") ||
    link.sent === null ||
    link.ackedVersion < link.syncVersion
  ) {
    return "waitingForWatch";
  }
  return link.lastError ? "failed" : "synced";
}

/**
 * Drops older unconfirmed upserts of the same playlist when a newer one is
 * queued; the watch applies them in order, only the newest is awaited.
 */
export function supersedePlaylistUpserts(
  cache: WatchLibraryCache,
  id: string,
): WatchLibraryCache {
  return {
    ...cache,
    pendingCommands: cache.pendingCommands.filter(
      pending =>
        !(
          pending.command.op === "upsertPlaylist" &&
          pending.command.args.id === id &&
          pending.state !== "failed"
        ),
    ),
  };
}
