import type {
  WatchLibrarySnapshot,
  WatchLibraryStatus,
} from "@/hooks/watchSync/WatchLibraryProtocol";

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
}

export const unavailableWatchLibrary: WatchLibraryContextValue = {
  available: false,
  reachable: false,
  snapshot: null,
  status: null,
  lastSyncAt: null,
  waitingForSnapshot: false,
  requestSnapshot: () => {},
};
