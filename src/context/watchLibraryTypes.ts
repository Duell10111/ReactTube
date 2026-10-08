import type {
  LinkedPlaylist,
  WatchLibraryCommandOp,
  WatchLibraryPendingCommand,
  WatchLibrarySnapshot,
  WatchLibraryStatus,
} from "@/hooks/watchSync/WatchLibraryProtocol";

/** Commands the phone can send; snapshot requests are handled internally. */
export type WatchLibraryUserCommandOp = Exclude<
  WatchLibraryCommandOp,
  "requestSnapshot"
>;

export interface WatchLibraryContextValue {
  /** True if this device can manage an installed watch app at all. */
  available: boolean;
  reachable: boolean;
  /** Last snapshot received from the watch, possibly from an earlier session. */
  snapshot: WatchLibrarySnapshot | null;
  /** Latest short status from the watch; may be newer than the snapshot. */
  status: WatchLibraryStatus | null;
  /** Phone time (ms) at which the snapshot was received. */
  lastSyncAt: number | null;
  /** True while a requested snapshot has not arrived yet. */
  waitingForSnapshot: boolean;
  requestSnapshot: () => void;
  /** Commands not yet confirmed by a snapshot, oldest first. */
  pendingCommands: WatchLibraryPendingCommand[];
  sendCommand: (
    op: WatchLibraryUserCommandOp,
    args?: Record<string, unknown>,
  ) => void;
  retryCommand: (commandId: string) => void;
  discardCommand: (commandId: string) => void;
  /** Playlists linked between phone and watch, by playlist id. */
  linkedPlaylists: Record<string, LinkedPlaylist>;
  linkPlaylist: (id: string, autoDownload: boolean) => void;
  /** Removes the playlist from the watch; downloads only if requested. */
  unlinkPlaylist: (id: string, deleteDownloads: boolean) => void;
  setLinkedPlaylistAutoDownload: (id: string, enabled: boolean) => void;
  syncLinkedPlaylists: () => void;
}

export const unavailableWatchLibrary: WatchLibraryContextValue = {
  available: false,
  reachable: false,
  snapshot: null,
  status: null,
  lastSyncAt: null,
  waitingForSnapshot: false,
  requestSnapshot: () => {},
  pendingCommands: [],
  sendCommand: () => {},
  retryCommand: () => {},
  discardCommand: () => {},
  linkedPlaylists: {},
  linkPlaylist: () => {},
  unlinkPlaylist: () => {},
  setLinkedPlaylistAutoDownload: () => {},
  syncLinkedPlaylists: () => {},
};
