import {File, Paths} from "expo-file-system";
import {
  addApplicationContextListener,
  addFileListener,
  addMessageListener,
  addUserInfoTransferFinishedListener,
  getReceivedApplicationContext,
  isSupported,
  transferUserInfo,
  useInstalled,
  useReachable,
} from "expo-watch-connectivity";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Crypto from "react-native-quick-crypto";

import {
  unavailableWatchLibrary,
  type WatchLibraryContextValue,
  type WatchLibraryUserCommandOp,
} from "./watchLibraryTypes";

import {
  addWatchLibraryPendingCommand,
  applyWatchPlaylistChange,
  applyWatchLibraryCommandResult,
  applyWatchLibrarySnapshot,
  createEmptyWatchLibraryCache,
  createWatchLibraryCommand,
  discardWatchLibraryPendingCommand,
  isWatchLibrarySnapshotOutdated,
  markWatchLibraryCommandFailed,
  parseWatchLibraryCache,
  parseWatchLibraryCommandResult,
  parseWatchLibrarySnapshotJSON,
  parseWatchLibraryStatus,
  parseWatchPlaylistChanged,
  parseWatchPlaylistDeleted,
  removeLinkedPlaylist,
  resendWatchLibraryPendingCommand,
  WATCH_LIBRARY_COMMAND_TYPE,
  WATCH_LIBRARY_SNAPSHOT_TYPE,
  type WatchLibraryCache,
  type WatchLibraryCommand,
  type WatchLibraryCommandOp,
  type WatchLibrarySnapshot,
} from "@/hooks/watchSync/WatchLibraryProtocol";
import useLinkedPlaylists from "@/hooks/watchSync/useLinkedPlaylists";
import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("WATCH_LIBRARY");

// Avoids flooding the transferUserInfo queue while the watch app is asleep.
const SNAPSHOT_REQUEST_COOLDOWN_MS = 15_000;
// Stop showing a spinner if the watch does not answer; the request stays queued.
const SNAPSHOT_WAIT_TIMEOUT_MS = 20_000;

const cacheFile = new File(Paths.document, "watch-library.json");

function loadCache(): WatchLibraryCache {
  try {
    return cacheFile.exists
      ? parseWatchLibraryCache(cacheFile.textSync())
      : createEmptyWatchLibraryCache();
  } catch (error) {
    LOGGER.warn("Reading watch library cache failed", error);
    return createEmptyWatchLibraryCache();
  }
}

function persistCache(cache: WatchLibraryCache) {
  try {
    if (!cacheFile.exists) {
      cacheFile.create({intermediates: true});
    }
    cacheFile.write(JSON.stringify(cache));
  } catch (error) {
    LOGGER.warn("Writing watch library cache failed", error);
  }
}

const WatchLibraryContext = createContext<WatchLibraryContextValue>(
  unavailableWatchLibrary,
);

export function WatchLibraryProvider({children}: {children: React.ReactNode}) {
  const installed = useInstalled();
  const reachable = useReachable();
  const available = isSupported && installed;

  const [cache, setCacheState] = useState<WatchLibraryCache>(loadCache);
  const [waitingForSnapshot, setWaitingForSnapshot] = useState(false);
  const lastRequestAtRef = useRef(0);
  const loadedCacheRef = useRef(cache);
  const cacheRef = useRef(cache);
  // Updates go through the ref, so asynchronous sync steps always build on the
  // latest state instead of the one from their render.
  const setCache = useCallback(
    (update: (current: WatchLibraryCache) => WatchLibraryCache) => {
      const next = update(cacheRef.current);
      if (next !== cacheRef.current) {
        cacheRef.current = next;
        setCacheState(next);
      }
    },
    [],
  );
  const getCache = useCallback(() => cacheRef.current, []);

  useEffect(() => {
    // The cache file is the whole state; skip rewriting what was just loaded.
    if (cache !== loadedCacheRef.current) {
      persistCache(cache);
    }
  }, [cache]);

  const receiveSnapshot = useCallback((snapshot: WatchLibrarySnapshot) => {
    LOGGER.debug(`Received watch library snapshot ${snapshot.revision}`);
    setCache(current =>
      applyWatchLibrarySnapshot(current, snapshot, Date.now()),
    );
    setWaitingForSnapshot(false);
  }, []);

  const receiveApplicationContext = useCallback((context: unknown) => {
    const status = parseWatchLibraryStatus(context);
    if (status) {
      setCache(current => ({...current, status}));
    }
  }, []);

  const sendSnapshotRequest = useCallback((force: boolean) => {
    const now = Date.now();
    if (
      !force &&
      now - lastRequestAtRef.current < SNAPSHOT_REQUEST_COOLDOWN_MS
    ) {
      return;
    }
    lastRequestAtRef.current = now;
    setWaitingForSnapshot(true);
    const command = createWatchLibraryCommand(
      "requestSnapshot",
      {},
      Crypto.randomUUID(),
      now,
    );
    transferUserInfo(command)
      .then(queued => {
        if (!queued) {
          setWaitingForSnapshot(false);
        }
      })
      .catch(error => {
        LOGGER.warn("Requesting watch library snapshot failed", error);
        setWaitingForSnapshot(false);
      });
  }, []);

  const transferCommand = useCallback((command: WatchLibraryCommand) => {
    // Queued via transferUserInfo, so it survives until the watch app wakes up.
    transferUserInfo(command)
      .then(queued => {
        if (!queued) {
          setCache(current =>
            markWatchLibraryCommandFailed(
              current,
              command.commandId,
              "WatchConnectivity session is not active",
            ),
          );
        }
      })
      .catch(error => {
        setCache(current =>
          markWatchLibraryCommandFailed(
            current,
            command.commandId,
            String(error),
          ),
        );
      });
  }, []);

  const queueCommand = useCallback(
    (op: WatchLibraryCommandOp, args: Record<string, unknown>) => {
      if (!available) {
        return;
      }
      const now = Date.now();
      const command = createWatchLibraryCommand(
        op,
        args,
        Crypto.randomUUID(),
        now,
      );
      setCache(current => addWatchLibraryPendingCommand(current, command, now));
      transferCommand(command);
    },
    [available, setCache, transferCommand],
  );

  const sendCommand = useCallback(
    (op: WatchLibraryUserCommandOp, args: Record<string, unknown> = {}) =>
      queueCommand(op, args),
    [queueCommand],
  );

  const {
    linkPlaylist,
    unlinkPlaylist,
    setLinkedPlaylistAutoDownload,
    syncLinkedPlaylists,
    scheduleSync,
  } = useLinkedPlaylists({
    available,
    getCache,
    updateCache: setCache,
    queueCommand,
  });

  const retryCommand = useCallback(
    (commandId: string) => {
      const pending = cacheRef.current.pendingCommands.find(
        item => item.command.commandId === commandId,
      );
      if (!available || !pending) {
        return;
      }
      const now = Date.now();
      const newCommandId = Crypto.randomUUID();
      setCache(current =>
        resendWatchLibraryPendingCommand(current, commandId, newCommandId, now),
      );
      transferCommand({
        ...pending.command,
        commandId: newCommandId,
        issuedAt: now,
      });
    },
    [available, transferCommand],
  );

  const discardCommand = useCallback((commandId: string) => {
    setCache(current => discardWatchLibraryPendingCommand(current, commandId));
  }, []);

  const requestSnapshot = useCallback(() => {
    if (available) {
      sendSnapshotRequest(true);
    }
  }, [available, sendSnapshotRequest]);

  useEffect(() => {
    if (!waitingForSnapshot) {
      return;
    }
    const timeout = setTimeout(
      () => setWaitingForSnapshot(false),
      SNAPSHOT_WAIT_TIMEOUT_MS,
    );
    return () => clearTimeout(timeout);
  }, [waitingForSnapshot]);

  useEffect(() => {
    if (!isSupported) {
      return;
    }
    getReceivedApplicationContext()
      .then(receiveApplicationContext)
      .catch(LOGGER.warn);

    const contextSub = addApplicationContextListener(receiveApplicationContext);
    const messageSub = addMessageListener(message => {
      if (
        message.type === WATCH_LIBRARY_SNAPSHOT_TYPE &&
        typeof message.json === "string"
      ) {
        const snapshot = parseWatchLibrarySnapshotJSON(message.json);
        if (snapshot) {
          receiveSnapshot(snapshot);
        } else {
          LOGGER.warn("Ignoring invalid inline watch library snapshot");
        }
        return;
      }
      const result = parseWatchLibraryCommandResult(message);
      if (result) {
        LOGGER.debug(
          `Watch library command ${result.commandId}: ${result.status}`,
          result.error ?? "",
        );
        setCache(current => applyWatchLibraryCommandResult(current, result));
        return;
      }
      const change = parseWatchPlaylistChanged(message);
      if (change) {
        setCache(current => applyWatchPlaylistChange(current, change));
        scheduleSync(change.id);
        return;
      }
      const deletedId = parseWatchPlaylistDeleted(message);
      if (deletedId) {
        // Deleted on the watch: only the link ends, the phone playlist stays.
        setCache(current => removeLinkedPlaylist(current, deletedId));
      }
    });
    const transferSub = addUserInfoTransferFinishedListener(event => {
      const {userInfo, error} = event;
      if (
        error &&
        userInfo.type === WATCH_LIBRARY_COMMAND_TYPE &&
        typeof userInfo.commandId === "string"
      ) {
        setCache(current =>
          markWatchLibraryCommandFailed(current, userInfo.commandId, error),
        );
      }
    });
    const fileSub = addFileListener(event => {
      if (event.metadata?.type !== WATCH_LIBRARY_SNAPSHOT_TYPE) {
        return;
      }
      const file = new File(event.uri);
      file
        .text()
        .then(json => {
          const snapshot = parseWatchLibrarySnapshotJSON(json);
          if (snapshot) {
            receiveSnapshot(snapshot);
          } else {
            LOGGER.warn("Ignoring invalid watch library snapshot file");
          }
        })
        .catch(error =>
          LOGGER.warn("Reading watch library snapshot failed", error),
        )
        .finally(() => {
          try {
            file.delete();
          } catch (error) {
            LOGGER.warn("Deleting watch library snapshot file failed", error);
          }
        });
    });

    return () => {
      contextSub.remove();
      messageSub.remove();
      transferSub.remove();
      fileSub.remove();
    };
  }, [receiveApplicationContext, receiveSnapshot, scheduleSync, setCache]);

  // Fetch a snapshot whenever the watch reports a newer revision than cached.
  useEffect(() => {
    if (
      available &&
      isWatchLibrarySnapshotOutdated(cache.snapshot, cache.status)
    ) {
      sendSnapshotRequest(false);
    }
  }, [available, cache.snapshot, cache.status, sendSnapshotRequest]);

  const value = useMemo<WatchLibraryContextValue>(
    () => ({
      available,
      reachable,
      snapshot: cache.snapshot,
      status: cache.status,
      lastSyncAt: cache.lastSyncAt,
      waitingForSnapshot,
      requestSnapshot,
      pendingCommands: cache.pendingCommands,
      sendCommand,
      retryCommand,
      discardCommand,
      linkedPlaylists: cache.linkedPlaylists,
      linkPlaylist,
      unlinkPlaylist,
      setLinkedPlaylistAutoDownload,
      syncLinkedPlaylists,
    }),
    [
      available,
      reachable,
      cache,
      waitingForSnapshot,
      requestSnapshot,
      sendCommand,
      retryCommand,
      discardCommand,
      linkPlaylist,
      unlinkPlaylist,
      setLinkedPlaylistAutoDownload,
      syncLinkedPlaylists,
    ],
  );

  return (
    <WatchLibraryContext.Provider value={value}>
      {children}
    </WatchLibraryContext.Provider>
  );
}

export function useWatchLibrary() {
  return useContext(WatchLibraryContext);
}
