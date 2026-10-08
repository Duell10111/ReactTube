import {File, Paths} from "expo-file-system";
import {
  addApplicationContextListener,
  addFileListener,
  addMessageListener,
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
} from "./watchLibraryTypes";

import {
  applyWatchLibrarySnapshot,
  createEmptyWatchLibraryCache,
  createWatchLibraryCommand,
  isWatchLibrarySnapshotOutdated,
  parseWatchLibraryCache,
  parseWatchLibraryCommandResult,
  parseWatchLibrarySnapshotJSON,
  parseWatchLibraryStatus,
  WATCH_LIBRARY_SNAPSHOT_TYPE,
  type WatchLibraryCache,
  type WatchLibrarySnapshot,
} from "@/hooks/watchSync/WatchLibraryProtocol";
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

  const [cache, setCache] = useState<WatchLibraryCache>(loadCache);
  const [waitingForSnapshot, setWaitingForSnapshot] = useState(false);
  const lastRequestAtRef = useRef(0);
  const loadedCacheRef = useRef(cache);

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
        // Pending commands are tracked once the watch accepts more than snapshot requests.
        LOGGER.debug(
          `Watch library command ${result.commandId}: ${result.status}`,
          result.error ?? "",
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
      fileSub.remove();
    };
  }, [receiveApplicationContext, receiveSnapshot]);

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
    }),
    [available, reachable, cache, waitingForSnapshot, requestSnapshot],
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
