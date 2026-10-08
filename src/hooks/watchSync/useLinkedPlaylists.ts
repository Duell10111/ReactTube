import {count} from "drizzle-orm";
import {useLiveQuery} from "drizzle-orm/expo-sqlite";
import {useCallback, useEffect, useRef} from "react";
import {AppState} from "react-native";

import {
  createLinkedPlaylist,
  createUpsertPlaylistArgs,
  planLinkedPlaylistSync,
  removeLinkedPlaylist,
  setLinkedPlaylist,
  supersedePlaylistUpserts,
  type LinkedPlaylist,
  type LinkedPlaylistVideo,
  type WatchLibraryCache,
  type WatchLibraryCommandOp,
  type WatchPlaylistState,
} from "./WatchLibraryProtocol";
import {planPlaylistMoves} from "./watchPlaylistMerge";

import {useYoutubeContext} from "@/context/YoutubeContext";
import {isLocalPlaylist} from "@/downloader/DBData";
import {
  db,
  getPlaylist,
  getPlaylistVideos,
  setPlaylistOrder,
} from "@/downloader/DownloadDatabaseOperations";
import * as schema from "@/downloader/schema";
import {getMusicPlaylistDetails} from "@/hooks/music/useMusicPlaylistDetails";
import {addPlaylistChangeListener} from "@/hooks/playlist/playlistChangeEvents";
import usePlaylistManager from "@/hooks/playlist/usePlaylistManager";
import Logger from "@/utils/Logger";

const LOGGER = Logger.extend("WATCH_PLAYLISTS");

// Upper bound for continuation pages of a YouTube playlist (~100 titles each).
const MAX_PLAYLIST_PAGES = 30;
// Bursts of local database writes (adding many titles) produce one sync.
const LOCAL_CHANGE_DEBOUNCE_MS = 1000;

interface PhonePlaylist {
  title: string;
  videos: LinkedPlaylistVideo[];
}

type InnerTube = ReturnType<typeof useYoutubeContext>;

/** Playlist ids may carry YouTube's "VL" browse prefix on one side only. */
function normalizePlaylistId(id: string) {
  return id.startsWith("VL") ? id.slice(2) : id;
}

/** Loads the playlist from the phone; null if a local playlist no longer exists. */
async function loadPhonePlaylist(
  id: string,
  youtube: InnerTube,
): Promise<PhonePlaylist | null> {
  if (isLocalPlaylist(id)) {
    const playlist = await getPlaylist(id);
    if (!playlist) {
      return null;
    }
    const videos = await getPlaylistVideos(id);
    return {
      title: playlist.name ?? "",
      videos: videos.map(video => ({
        id: video.id,
        title: video.name ?? undefined,
        artist: video.author ?? undefined,
        durationMillis: video.duration ? video.duration * 1000 : undefined,
        coverUrl: video.coverUrl ?? undefined,
      })),
    };
  }

  const playlist = await getMusicPlaylistDetails(id, youtube);
  for (
    let page = 0;
    page < MAX_PLAYLIST_PAGES && playlist.originalData.has_continuation;
    page += 1
  ) {
    await playlist.loadMore();
  }
  return {
    title: playlist.title,
    videos: playlist.items
      .filter(item => item.type === "video")
      .map(item => ({
        id: item.id,
        title: item.title,
        artist: item.author?.name,
        durationMillis:
          item.type === "video" && item.durationSeconds
            ? item.durationSeconds * 1000
            : undefined,
        coverUrl: item.thumbnailImage?.url,
      })),
  };
}

function toState(playlist: PhonePlaylist): WatchPlaylistState {
  return {
    title: playlist.title,
    videoIds: playlist.videos.map(video => video.id),
  };
}

interface Options {
  available: boolean;
  getCache: () => WatchLibraryCache;
  updateCache: (
    update: (cache: WatchLibraryCache) => WatchLibraryCache,
  ) => void;
  queueCommand: (
    op: WatchLibraryCommandOp,
    args: Record<string, unknown>,
  ) => void;
}

/**
 * Keeps playlists linked to the watch in sync in both directions. The phone
 * merges every change and sends the result as `upsertPlaylist`; edits from
 * the watch are first applied to the phone playlist.
 */
export default function useLinkedPlaylists({
  available,
  getCache,
  updateCache,
  queueCommand,
}: Options) {
  const youtube = useYoutubeContext();
  const playlistManager = usePlaylistManager();
  const depsRef = useRef({youtube, playlistManager});
  depsRef.current = {youtube, playlistManager};
  // Syncs of the same playlist run one after another.
  const queuesRef = useRef(new Map<string, Promise<void>>());

  const updateLink = useCallback(
    (id: string, update: (link: LinkedPlaylist) => LinkedPlaylist) => {
      updateCache(cache => {
        const link = cache.linkedPlaylists[id];
        return link ? setLinkedPlaylist(cache, update(link)) : cache;
      });
    },
    [updateCache],
  );

  const unlink = useCallback(
    (id: string, deleteDownloads: boolean) => {
      updateCache(cache => removeLinkedPlaylist(cache, id));
      queueCommand("deletePlaylist", {id, deleteDownloads});
    },
    [queueCommand, updateCache],
  );

  const applyWatchEdits = useCallback(
    async (
      id: string,
      update: {add: string[]; remove: string[]; reorder: boolean},
      target: string[],
    ) => {
      const {playlistManager: manager, youtube: innertube} = depsRef.current;
      if (update.add.length > 0) {
        await manager.saveVideoToPlaylist(update.add, id);
      }
      if (update.remove.length > 0) {
        await manager.removeVideoFromPlaylist(update.remove, id);
      }
      if (!update.reorder && update.add.length === 0) {
        return;
      }
      if (isLocalPlaylist(id)) {
        await setPlaylistOrder(id, target);
        return;
      }
      // YouTube appends new titles; read the real order before moving.
      const current = await loadPhonePlaylist(id, innertube);
      const currentIds = current ? toState(current).videoIds : [];
      for (const move of planPlaylistMoves(currentIds, target)) {
        await manager.moveVideo(id, move.videoId, move.predecessorId);
      }
    },
    [],
  );

  const syncNow = useCallback(
    async (id: string) => {
      const link = getCache().linkedPlaylists[id];
      if (!link) {
        return;
      }
      const {youtube: innertube} = depsRef.current;

      let phone: PhonePlaylist | null;
      try {
        phone = await loadPhonePlaylist(id, innertube);
      } catch (error) {
        LOGGER.warn(`Loading linked playlist ${id} failed`, error);
        updateLink(id, current => ({...current, lastError: String(error)}));
        return;
      }
      if (!phone) {
        // The phone playlist was deleted, so the watch copy goes as well.
        LOGGER.debug(`Linked playlist ${id} was deleted on the phone`);
        unlink(id, true);
        return;
      }

      const plan = planLinkedPlaylistSync(link, toState(phone));
      const appliedChange = link.pendingWatchChange;
      let videos = phone.videos;

      if (plan.phoneUpdate) {
        try {
          await applyWatchEdits(id, plan.phoneUpdate, plan.desired.videoIds);
          const updated = await loadPhonePlaylist(id, innertube);
          videos = updated?.videos ?? videos;
        } catch (error) {
          // Stays pending and is retried on the next trigger.
          LOGGER.warn(`Applying watch edits to playlist ${id} failed`, error);
          updateLink(id, current => ({...current, lastError: String(error)}));
          return;
        }
      }

      const latest = getCache().linkedPlaylists[id];
      if (!latest) {
        return;
      }
      // A newer watch edit that arrived meanwhile stays pending for the next run.
      const changeHandled = latest.pendingWatchChange === appliedChange;

      if (plan.sendToWatch) {
        const syncVersion = latest.syncVersion + 1;
        const args = createUpsertPlaylistArgs(
          latest,
          plan.desired,
          syncVersion,
          videos,
          getCache().snapshot,
        );
        updateCache(cache => supersedePlaylistUpserts(cache, id));
        queueCommand("upsertPlaylist", args);
        updateLink(id, current => ({
          ...current,
          syncVersion,
          sent: plan.desired,
          pendingWatchChange: changeHandled ? null : current.pendingWatchChange,
          lastError: undefined,
        }));
      } else {
        updateLink(id, current => ({
          ...current,
          pendingWatchChange: changeHandled ? null : current.pendingWatchChange,
          lastError: undefined,
        }));
      }

      if (!changeHandled) {
        scheduleSyncRef.current(id);
      }
    },
    [applyWatchEdits, getCache, queueCommand, unlink, updateCache, updateLink],
  );

  const scheduleSync = useCallback(
    (id: string) => {
      const queues = queuesRef.current;
      const previous = queues.get(id) ?? Promise.resolve();
      const next = previous
        .then(() => syncNow(id))
        .catch(error => LOGGER.warn(`Syncing playlist ${id} failed`, error));
      queues.set(id, next);
      return next;
    },
    [syncNow],
  );
  const scheduleSyncRef = useRef(scheduleSync);
  scheduleSyncRef.current = scheduleSync;

  const syncLinkedPlaylists = useCallback(
    (filter?: (id: string) => boolean) => {
      if (!available) {
        return;
      }
      Object.keys(getCache().linkedPlaylists)
        .filter(id => !filter || filter(id))
        .forEach(id => scheduleSync(id));
    },
    [available, getCache, scheduleSync],
  );

  const linkPlaylist = useCallback(
    (id: string, autoDownload: boolean) => {
      if (!available || getCache().linkedPlaylists[id]) {
        return;
      }
      updateCache(cache =>
        setLinkedPlaylist(cache, createLinkedPlaylist(id, autoDownload)),
      );
      scheduleSync(id);
    },
    [available, getCache, scheduleSync, updateCache],
  );

  const unlinkPlaylist = useCallback(
    (id: string, deleteDownloads: boolean) => {
      if (getCache().linkedPlaylists[id]) {
        unlink(id, deleteDownloads);
      }
    },
    [getCache, unlink],
  );

  const setLinkedPlaylistAutoDownload = useCallback(
    (id: string, enabled: boolean) => {
      if (!getCache().linkedPlaylists[id]) {
        return;
      }
      updateLink(id, link => ({...link, autoDownload: enabled}));
      queueCommand("setPlaylistAutoDownload", {id, enabled});
    },
    [getCache, queueCommand, updateLink],
  );

  // App start and every return to the foreground: YouTube playlists may have
  // been changed in other clients, which never pushes anything.
  useEffect(() => {
    if (!available) {
      return;
    }
    syncLinkedPlaylists();
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") {
        syncLinkedPlaylists();
      }
    });
    return () => subscription.remove();
  }, [available, syncLinkedPlaylists]);

  // Edits made through the app's playlist managers.
  useEffect(() => {
    return addPlaylistChangeListener(playlistId => {
      const normalized = normalizePlaylistId(playlistId);
      syncLinkedPlaylists(id => normalizePlaylistId(id) === normalized);
    });
  }, [syncLinkedPlaylists]);

  // Live queries re-run on every write to these tables; their timestamps act
  // as change signals for local playlists.
  const {updatedAt: playlistsUpdatedAt} = useLiveQuery(
    db.select({count: count()}).from(schema.playlists),
  );
  const {updatedAt: playlistVideosUpdatedAt} = useLiveQuery(
    db.select({count: count()}).from(schema.playlistVideos),
  );
  const localChangeToken = `${playlistsUpdatedAt?.getTime()}-${playlistVideosUpdatedAt?.getTime()}`;
  const firstLocalChange = useRef(true);
  useEffect(() => {
    if (firstLocalChange.current) {
      firstLocalChange.current = false;
      return;
    }
    const timeout = setTimeout(
      () => syncLinkedPlaylists(isLocalPlaylist),
      LOCAL_CHANGE_DEBOUNCE_MS,
    );
    return () => clearTimeout(timeout);
  }, [localChangeToken, syncLinkedPlaylists]);

  return {
    linkPlaylist,
    unlinkPlaylist,
    setLinkedPlaylistAutoDownload,
    syncLinkedPlaylists,
    scheduleSync,
  };
}
