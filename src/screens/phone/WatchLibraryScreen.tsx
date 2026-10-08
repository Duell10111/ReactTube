import {RouteProp, useRoute} from "@react-navigation/native";
import React, {useCallback, useEffect, useMemo, useState} from "react";
import {
  Alert,
  FlatList,
  ListRenderItem,
  Pressable,
  RefreshControl,
  View,
} from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";

import {useAppData} from "@/context/AppDataContext";
import {useWatchLibrary} from "@/context/WatchLibraryContext";
import {isLocalPlaylist} from "@/downloader/DBData";
import {
  applyPendingCommands,
  createDownloadVideosArgs,
  formatByteSize,
  getWatchLibraryCommandVideoIds,
  isWatchLibraryCommandStale,
  isWatchLibrarySnapshotOutdated,
  normalizeWatchLibraryDownloadSort,
  planSelectionRemoval,
  sortWatchLibraryDownloads,
  WATCH_LIBRARY_DOWNLOAD_SORTS,
  type LinkedPlaylistStatus,
  type WatchLibraryDownloadSort,
  type WatchLibraryCommand,
  type WatchLibraryCommandOp,
  type WatchLibraryDownloadRow,
  type WatchLibraryPendingCommand,
  type WatchLibraryPlaylistRow,
  type WatchLibraryStorageSummary,
  buildWatchTransferRows,
  splitByPhoneAvailability,
  withLiveProgress,
  type WatchTransferRow,
} from "@/hooks/watchSync/WatchLibraryProtocol";
import {type TranslationKey, useTranslation} from "@/localization";
import type {RootStackParamList} from "@/navigation/RootStackNavigator";
import {
  AppButton,
  AppListItem,
  AppText,
  Chip,
  EmptyState,
} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

type Tab = "downloads" | "playlists" | "transfers";

type Row =
  | {kind: "download"; row: WatchLibraryDownloadRow}
  | {kind: "playlist"; row: WatchLibraryPlaylistRow}
  | {kind: "transfer"; row: WatchTransferRow};

function rowKey(item: Row) {
  return item.kind === "transfer"
    ? item.row.key
    : `${item.kind}-${item.row.id}`;
}

const SORT_LABELS: Record<WatchLibraryDownloadSort, TranslationKey> = {
  added: "watchLibrary.sort.added",
  name: "watchLibrary.sort.name",
  size: "watchLibrary.sort.size",
};

interface SwipeToRemoveProps {
  label: string;
  enabled: boolean;
  onRemove: () => void;
  children: React.ReactNode;
}

/**
 * Swipe a row to the left to reveal a remove button. The same action stays
 * reachable through the row's action menu, which VoiceOver can use.
 */
function SwipeToRemove({
  label,
  enabled,
  onRemove,
  children,
}: SwipeToRemoveProps) {
  const {theme} = useAppTheme();
  return (
    <ReanimatedSwipeable
      enabled={enabled}
      friction={2}
      overshootRight={false}
      rightThreshold={40}
      renderRightActions={(_progress, _translation, methods) => (
        <Pressable
          accessibilityLabel={label}
          accessibilityRole={"button"}
          onPress={() => {
            methods.close();
            onRemove();
          }}
          style={{
            backgroundColor: theme.colors.error,
            borderRadius: theme.radii.control,
            justifyContent: "center",
            marginLeft: theme.spacing.xs,
            paddingHorizontal: theme.spacing.lg,
          }}>
          <AppText style={{color: theme.colors.onBrand}} variant={"label"}>
            {label}
          </AppText>
        </Pressable>
      )}>
      {children}
    </ReanimatedSwipeable>
  );
}

function formatSyncTime(timestamp: number, language: string) {
  const date = new Date(timestamp);
  const sameDay = date.toDateString() === new Date().toDateString();
  return new Intl.DateTimeFormat(
    language,
    sameDay
      ? {hour: "2-digit", minute: "2-digit"}
      : {day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"},
  ).format(date);
}

function StorageBar({storage}: {storage: WatchLibraryStorageSummary}) {
  const {t, language} = useTranslation();
  const {theme} = useAppTheme();
  const percent = Math.round(storage.usedFraction * 100);

  return (
    <View
      accessibilityLabel={t("watchLibrary.storage.accessibility", {percent})}
      accessible
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radii.card,
        gap: theme.spacing.sm,
        padding: theme.spacing.lg,
      }}>
      <AppText variant={"titleSmall"}>
        {t("watchLibrary.storage.title")}
      </AppText>
      <View
        style={{
          backgroundColor: theme.colors.surfacePressed,
          borderRadius: theme.radii.round,
          height: 8,
          overflow: "hidden",
        }}>
        <View
          style={{
            backgroundColor: theme.colors.brand,
            height: "100%",
            // Keep a visible sliver once anything is stored.
            width: `${storage.usedBytes > 0 ? Math.max(percent, 1) : 0}%`,
          }}
        />
      </View>
      <AppText color={"textSecondary"} variant={"bodySmall"}>
        {t("watchLibrary.storage.summary", {
          used: formatByteSize(storage.usedBytes, language),
          available: formatByteSize(storage.availableBytes, language),
        })}
      </AppText>
    </View>
  );
}

function linkStatusLabel(
  id: string,
  status: LinkedPlaylistStatus,
): TranslationKey {
  switch (status) {
    case "synced":
      return "watchLibrary.link.status.synced";
    case "waitingForWatch":
      return "watchLibrary.link.status.waitingForWatch";
    case "waitingForPhone":
      return isLocalPlaylist(id)
        ? "watchLibrary.link.status.waitingForPhone"
        : "watchLibrary.link.status.waitingForYouTube";
    default:
      return "watchLibrary.link.status.failed";
  }
}

const PENDING_OP_LABELS: Partial<
  Record<WatchLibraryCommandOp, TranslationKey>
> = {
  downloadVideos: "watchLibrary.pendingOp.downloadVideos",
  transferVideo: "watchLibrary.pendingOp.transferVideo",
  cancelDownloads: "watchLibrary.pendingOp.cancelDownloads",
  deleteDownload: "watchLibrary.pendingOp.deleteDownload",
  removeVideos: "watchLibrary.pendingOp.removeVideos",
  clearAllDownloads: "watchLibrary.pendingOp.deleteDownload",
};

function useCommandDescription() {
  const {t} = useTranslation();
  return useCallback(
    (command: WatchLibraryCommand) => {
      const count = getWatchLibraryCommandVideoIds(command).length;
      switch (command.op) {
        case "downloadVideos":
          return t("watchLibrary.command.downloadVideos", {count});
        case "transferVideo":
          return t("watchLibrary.command.transferVideo", {count});
        case "cancelDownloads":
          return t("watchLibrary.command.cancelDownloads", {count});
        case "deleteDownload":
          return t("watchLibrary.command.deleteDownload", {count});
        case "removeVideos":
          return t("watchLibrary.command.removeVideos", {count});
        case "clearAllDownloads":
          return t("watchLibrary.command.clearAllDownloads");
        case "upsertPlaylist":
          return t("watchLibrary.command.upsertPlaylist");
        case "deletePlaylist":
          return t("watchLibrary.command.deletePlaylist");
        case "setPlaylistAutoDownload":
          return t("watchLibrary.command.setPlaylistAutoDownload");
        default:
          return t("watchLibrary.command.other");
      }
    },
    [t],
  );
}

interface PendingCommandsProps {
  pendingCommands: WatchLibraryPendingCommand[];
  now: number;
  onRetry: (commandId: string) => void;
  onDiscard: (commandId: string) => void;
}

function PendingCommands({
  pendingCommands,
  now,
  onRetry,
  onDiscard,
}: PendingCommandsProps) {
  const {t, language} = useTranslation();
  const {theme} = useAppTheme();
  const describe = useCommandDescription();

  if (pendingCommands.length === 0) {
    return null;
  }

  const stateText = (pending: WatchLibraryPendingCommand) => {
    const time = formatSyncTime(pending.sentAt, language);
    switch (pending.state) {
      case "applied":
        return t("watchLibrary.state.applied");
      case "failed":
        if (pending.unsupported) {
          return t("watchLibrary.state.unsupported");
        }
        return pending.error
          ? t("watchLibrary.state.failedWithReason", {reason: pending.error})
          : t("watchLibrary.state.failed");
      default:
        return isWatchLibraryCommandStale(pending, now)
          ? t("watchLibrary.state.stale", {time})
          : t("watchLibrary.state.pending", {time});
    }
  };

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radii.card,
        gap: theme.spacing.md,
        padding: theme.spacing.lg,
      }}>
      <AppText variant={"titleSmall"}>
        {t("watchLibrary.pending.title")}
      </AppText>
      {pendingCommands.map(pending => {
        const {commandId} = pending.command;
        const attention =
          pending.state === "failed" ||
          isWatchLibraryCommandStale(pending, now);
        return (
          <View key={commandId} style={{gap: theme.spacing.xs}}>
            <AppText variant={"body"}>{describe(pending.command)}</AppText>
            <AppText
              color={pending.state === "failed" ? "error" : "textSecondary"}
              variant={"bodySmall"}>
              {stateText(pending)}
            </AppText>
            {pending.state !== "applied" ? (
              <View
                style={{
                  flexDirection: "row",
                  gap: theme.spacing.sm,
                  paddingTop: theme.spacing.xs,
                }}>
                <AppButton
                  label={t("watchLibrary.retry")}
                  onPress={() => onRetry(commandId)}
                  variant={attention ? "primary" : "secondary"}
                />
                <AppButton
                  label={t("watchLibrary.discard")}
                  onPress={() => onDiscard(commandId)}
                  variant={"secondary"}
                />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/** Library stored on the paired Apple Watch, managed through queued commands. */
export function WatchLibraryScreen() {
  const {t, language, formatDate} = useTranslation();
  const {theme} = useAppTheme();
  const {
    available,
    reachable,
    snapshot,
    status,
    lastSyncAt,
    waitingForSnapshot,
    requestSnapshot,
    pendingCommands,
    sendCommand,
    retryCommand,
    discardCommand,
    linkedPlaylists,
    unlinkPlaylist,
    setLinkedPlaylistAutoDownload,
    syncLinkedPlaylists,
    phoneDownloadedIds,
    transferVideos,
    fileTransfers,
    observeFileTransfers,
    liveProgress,
  } = useWatchLibrary();
  const {appSettings, updateSettings} = useAppData();
  const downloadSort = normalizeWatchLibraryDownloadSort(
    appSettings.watchLibraryDownloadSort,
  );
  const route = useRoute<RouteProp<RootStackParamList, "WatchLibraryScreen">>();
  const [tab, setTab] = useState<Tab>(route.params?.tab ?? "downloads");
  const [now, setNow] = useState(Date.now);
  /** Selected download ids while selection mode is active, otherwise null. */
  const [selection, setSelection] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (tab !== "downloads") {
      setSelection(null);
    }
  }, [tab]);

  useEffect(() => {
    requestSnapshot();
    // YouTube playlists never push changes; opening the screen is a sync point.
    syncLinkedPlaylists();
  }, [requestSnapshot, syncLinkedPlaylists]);

  useEffect(() => {
    // Keeps "no answer since" hints current while the screen stays open.
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Outgoing file transfers are only polled while their tab is visible.
    return tab === "transfers" ? observeFileTransfers() : undefined;
  }, [observeFileTransfers, tab]);

  // Live progress from a reachable watch is newer than the snapshot.
  const currentSnapshot = useMemo(
    () =>
      snapshot ? withLiveProgress(snapshot, liveProgress, Date.now()) : null,
    [snapshot, liveProgress],
  );

  const viewModel = useMemo(
    () =>
      currentSnapshot
        ? applyPendingCommands(
            currentSnapshot,
            pendingCommands,
            status,
            linkedPlaylists,
          )
        : null,
    [currentSnapshot, pendingCommands, status, linkedPlaylists],
  );

  const sortedDownloads = useMemo(
    () =>
      viewModel
        ? sortWatchLibraryDownloads(viewModel.downloads, downloadSort, language)
        : [],
    [downloadSort, language, viewModel],
  );

  const transferRows = useMemo(
    () => buildWatchTransferRows(fileTransfers, currentSnapshot),
    [fileTransfers, currentSnapshot],
  );

  const rows = useMemo<Row[]>(() => {
    if (tab === "transfers") {
      return transferRows.map(row => ({kind: "transfer", row}));
    }
    if (!viewModel) {
      return [];
    }
    return tab === "downloads"
      ? sortedDownloads.map(row => ({kind: "download", row}))
      : viewModel.playlists.map(row => ({kind: "playlist", row}));
  }, [sortedDownloads, tab, transferRows, viewModel]);

  const toggleSelected = useCallback((id: string) => {
    setSelection(current => {
      const next = new Set(current ?? []);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const chooseSort = useCallback(() => {
    Alert.alert(t("watchLibrary.sort.title"), undefined, [
      ...WATCH_LIBRARY_DOWNLOAD_SORTS.map(sort => ({
        text: t(SORT_LABELS[sort]),
        onPress: () => updateSettings({watchLibraryDownloadSort: sort}),
      })),
      {text: t("common.cancel"), style: "cancel" as const},
    ]);
  }, [t, updateSettings]);

  /** Deletes finished downloads and cancels running ones among the given ids. */
  const removeDownloads = useCallback(
    (ids: ReadonlySet<string>) => {
      const {deleteIds, cancelIds} = planSelectionRemoval(sortedDownloads, ids);
      if (deleteIds.length > 0) {
        sendCommand("deleteDownload", {videoIds: deleteIds});
      }
      if (cancelIds.length > 0) {
        sendCommand("cancelDownloads", {videoIds: cancelIds});
      }
    },
    [sendCommand, sortedDownloads],
  );

  const confirmSelectionRemoval = useCallback(() => {
    if (!selection || selection.size === 0) {
      return;
    }
    Alert.alert(
      t("watchLibrary.select.confirmTitle", {count: selection.size}),
      t("watchLibrary.select.confirmMessage"),
      [
        {text: t("common.cancel"), style: "cancel"},
        {
          text: t("watchLibrary.select.delete", {count: selection.size}),
          style: "destructive",
          onPress: () => {
            removeDownloads(selection);
            setSelection(null);
          },
        },
      ],
    );
  }, [removeDownloads, selection, t]);

  const showDownloadActions = useCallback(
    (row: WatchLibraryDownloadRow) => {
      const title = row.title || t("watchLibrary.untitled");
      const cancel = {text: t("common.cancel"), style: "cancel" as const};
      // Entry to selection mode without a long press, e.g. for VoiceOver.
      const selectMultiple = {
        text: t("watchLibrary.action.selectMultiple"),
        onPress: () => setSelection(new Set([row.id])),
      };
      if (row.state === "downloaded") {
        Alert.alert(title, row.artist, [
          {
            text: t("watchLibrary.action.deleteDownload"),
            style: "destructive",
            onPress: () => sendCommand("deleteDownload", {videoIds: [row.id]}),
          },
          selectMultiple,
          cancel,
        ]);
      } else {
        Alert.alert(title, row.artist, [
          // Already downloaded on the phone: no network needed on the watch.
          ...(phoneDownloadedIds.has(row.id)
            ? [
                {
                  text: t("watchLibrary.action.transferFromPhone"),
                  onPress: () => {
                    transferVideos([row.id]);
                  },
                },
              ]
            : []),
          {
            text: t("watchLibrary.action.cancelDownload"),
            style: "destructive",
            onPress: () => sendCommand("cancelDownloads", {videoIds: [row.id]}),
          },
          selectMultiple,
          cancel,
        ]);
      }
    },
    [phoneDownloadedIds, sendCommand, t, transferVideos],
  );

  const confirmPlaylistRemoval = useCallback(
    (row: WatchLibraryPlaylistRow, linked: boolean) => {
      const remove = (deleteDownloads: boolean) =>
        linked
          ? unlinkPlaylist(row.id, deleteDownloads)
          : sendCommand("deletePlaylist", {id: row.id, deleteDownloads});
      Alert.alert(
        t("watchLibrary.unlink.title"),
        t("watchLibrary.unlink.message"),
        [
          {
            text: t("watchLibrary.unlink.keepDownloads"),
            onPress: () => remove(false),
          },
          {
            text: t("watchLibrary.unlink.deleteDownloads"),
            style: "destructive",
            onPress: () => remove(true),
          },
          {text: t("common.cancel"), style: "cancel"},
        ],
      );
    },
    [sendCommand, t, unlinkPlaylist],
  );

  const showPlaylistActions = useCallback(
    (row: WatchLibraryPlaylistRow) => {
      const link = linkedPlaylists[row.id];
      const playlist = snapshot?.playlists.find(item => item.id === row.id);
      const buttons: Parameters<typeof Alert.alert>[2] = [];
      if (playlist) {
        const downloadedIds = new Set(
          snapshot?.videos
            .filter(video => video.downloaded)
            .map(video => video.id) ?? [],
        );
        const missing = playlist.videoIds.filter(id => !downloadedIds.has(id));
        const downloaded = playlist.videoIds.filter(id =>
          downloadedIds.has(id),
        );
        // Two visibly separate ways: files the phone already has, and
        // titles the watch downloads itself over Wi-Fi/LTE.
        const split = splitByPhoneAvailability(missing, phoneDownloadedIds);
        if (split.transfer.length > 0) {
          buttons.push({
            text: t("watchLibrary.action.transferPlaylist", {
              count: split.transfer.length,
            }),
            onPress: () => {
              transferVideos(split.transfer);
            },
          });
        }
        if (split.download.length > 0) {
          buttons.push({
            text: t("watchLibrary.action.downloadPlaylistOnWatch", {
              count: split.download.length,
            }),
            onPress: () =>
              sendCommand(
                "downloadVideos",
                createDownloadVideosArgs(split.download, snapshot),
              ),
          });
        }
        if (downloaded.length > 0) {
          buttons.push({
            text: t("watchLibrary.action.deletePlaylistDownloads"),
            style: "destructive",
            onPress: () =>
              sendCommand("deleteDownload", {videoIds: downloaded}),
          });
        }
      }
      if (link) {
        buttons.push({
          text: link.autoDownload
            ? t("watchLibrary.link.autoDownloadOff")
            : t("watchLibrary.link.autoDownloadOn"),
          onPress: () =>
            setLinkedPlaylistAutoDownload(row.id, !link.autoDownload),
        });
        buttons.push({
          text: t("watchLibrary.link.remove"),
          style: "destructive",
          onPress: () => confirmPlaylistRemoval(row, true),
        });
      } else if (playlist) {
        buttons.push({
          text: t("watchLibrary.action.removePlaylist"),
          style: "destructive",
          onPress: () => confirmPlaylistRemoval(row, false),
        });
      }
      if (buttons.length === 0) {
        return;
      }
      buttons.push({text: t("common.cancel"), style: "cancel"});
      Alert.alert(row.title || t("watchLibrary.untitled"), undefined, buttons);
    },
    [
      confirmPlaylistRemoval,
      linkedPlaylists,
      phoneDownloadedIds,
      sendCommand,
      setLinkedPlaylistAutoDownload,
      snapshot,
      t,
      transferVideos,
    ],
  );

  const confirmClearAll = useCallback(() => {
    Alert.alert(
      t("watchLibrary.clearAll.title"),
      t("watchLibrary.clearAll.message"),
      [
        {text: t("common.cancel"), style: "cancel"},
        {
          text: t("watchLibrary.action.clearAll"),
          style: "destructive",
          onPress: () => sendCommand("clearAllDownloads"),
        },
      ],
    );
  }, [sendCommand, t]);

  const renderItem = useCallback<ListRenderItem<Row>>(
    ({item}) => {
      if (item.kind === "transfer") {
        const {row} = item;
        const percent =
          row.progress !== undefined ? Math.round(row.progress * 100) : null;
        return (
          <AppListItem
            icon={
              row.kind === "upload"
                ? "upload"
                : percent !== null
                  ? "downloading"
                  : "schedule"
            }
            subtitle={
              row.kind === "upload"
                ? t("watchLibrary.transfer.fromPhone")
                : t("watchLibrary.transfer.onWatch")
            }
            title={row.title || t("watchLibrary.untitled")}
            trailingText={
              row.kind === "upload" && row.paused
                ? t("watchLibrary.transfer.paused")
                : percent !== null
                  ? t("watchLibrary.download.progress", {percent})
                  : t("watchLibrary.download.queued")
            }
          />
        );
      }
      if (item.kind === "playlist") {
        const {row} = item;
        return (
          <AppListItem
            icon={
              row.linkStatus
                ? "link"
                : row.autoDownload
                  ? "download-for-offline"
                  : "queue-music"
            }
            onPress={() => showPlaylistActions(row)}
            subtitle={[
              t("watchLibrary.playlist.summary", {
                count: row.videoCount,
                downloaded: row.downloadedCount,
              }),
              row.autoDownload ? t("watchLibrary.playlist.autoDownload") : "",
              row.linkStatus ? t(linkStatusLabel(row.id, row.linkStatus)) : "",
            ]
              .filter(Boolean)
              .join(" · ")}
            title={row.title || t("watchLibrary.untitled")}
          />
        );
      }
      const {row} = item;
      const pendingLabel = row.pendingOp
        ? PENDING_OP_LABELS[row.pendingOp]
        : undefined;
      const trailingText = pendingLabel
        ? t(pendingLabel)
        : row.state === "downloading"
          ? t("watchLibrary.download.progress", {
              percent: Math.round((row.progress ?? 0) * 100),
            })
          : row.state === "queued"
            ? t("watchLibrary.download.queued")
            : row.sizeBytes !== undefined
              ? formatByteSize(row.sizeBytes, language)
              : undefined;
      const selecting = selection !== null;
      const selected = selection?.has(row.id) ?? false;
      const subtitle = [
        row.artist,
        downloadSort === "added" && row.downloadedAt
          ? t("watchLibrary.download.added", {
              date: formatDate(row.downloadedAt),
            })
          : undefined,
      ]
        .filter(Boolean)
        .join(" · ");
      return (
        <SwipeToRemove
          enabled={!selecting}
          label={
            row.state === "downloaded"
              ? t("watchLibrary.swipe.delete")
              : t("watchLibrary.swipe.stop")
          }
          onRemove={() => removeDownloads(new Set([row.id]))}>
          <AppListItem
            icon={
              selecting
                ? selected
                  ? "check-box"
                  : "check-box-outline-blank"
                : pendingLabel
                  ? "hourglass-empty"
                  : row.state === "downloaded"
                    ? "download-done"
                    : row.state === "downloading"
                      ? "downloading"
                      : "schedule"
            }
            onLongPress={
              selecting ? undefined : () => setSelection(new Set([row.id]))
            }
            onPress={() =>
              selecting ? toggleSelected(row.id) : showDownloadActions(row)
            }
            selected={selected}
            subtitle={subtitle || undefined}
            title={row.title || t("watchLibrary.untitled")}
            trailingText={trailingText}
          />
        </SwipeToRemove>
      );
    },
    [
      downloadSort,
      formatDate,
      language,
      removeDownloads,
      selection,
      showDownloadActions,
      showPlaylistActions,
      t,
      toggleSelected,
    ],
  );

  if (!available) {
    return (
      <EmptyState
        message={t("watchLibrary.unavailable.message")}
        title={t("watchLibrary.unavailable.title")}
      />
    );
  }

  const syncText = waitingForSnapshot
    ? t("watchLibrary.waiting")
    : lastSyncAt
      ? t("watchLibrary.lastSync", {
          time: formatSyncTime(lastSyncAt, language),
        })
      : t("watchLibrary.neverSynced");

  const hasDownloads =
    viewModel?.downloads.some(row => row.state === "downloaded") ?? false;

  const header = (
    <View style={{gap: theme.spacing.md, paddingBottom: theme.spacing.sm}}>
      <View
        accessible
        style={{
          alignItems: "center",
          flexDirection: "row",
          gap: theme.spacing.sm,
        }}>
        <View
          style={{
            backgroundColor: reachable
              ? theme.colors.success
              : theme.colors.textDisabled,
            borderRadius: theme.radii.round,
            height: 8,
            width: 8,
          }}
        />
        <AppText color={"textSecondary"} variant={"bodySmall"}>
          {[
            reachable
              ? t("watchLibrary.connection.reachable")
              : t("watchLibrary.connection.unreachable"),
            syncText,
          ].join(" · ")}
        </AppText>
      </View>
      {snapshot && isWatchLibrarySnapshotOutdated(snapshot, status) ? (
        <AppText color={"textSecondary"} variant={"bodySmall"}>
          {t("watchLibrary.outdated")}
        </AppText>
      ) : null}
      <PendingCommands
        now={now}
        onDiscard={discardCommand}
        onRetry={retryCommand}
        pendingCommands={pendingCommands}
      />
      {viewModel ? <StorageBar storage={viewModel.storage} /> : null}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: theme.spacing.sm,
        }}>
        <Chip
          label={t("watchLibrary.tabs.downloads", {
            count: viewModel?.downloads.length ?? 0,
          })}
          onPress={() => setTab("downloads")}
          selected={tab === "downloads"}
        />
        <Chip
          label={t("watchLibrary.tabs.playlists", {
            count: viewModel?.playlists.length ?? 0,
          })}
          onPress={() => setTab("playlists")}
          selected={tab === "playlists"}
        />
        <Chip
          label={t("watchLibrary.tabs.transfers", {
            count: transferRows.length,
          })}
          onPress={() => setTab("transfers")}
          selected={tab === "transfers"}
        />
      </View>
      {tab === "downloads" && selection ? (
        <View
          style={{
            alignItems: "center",
            flexDirection: "row",
            flexWrap: "wrap",
            gap: theme.spacing.sm,
          }}>
          <AppText
            accessibilityLiveRegion={"polite"}
            style={{flexGrow: 1}}
            variant={"label"}>
            {t("watchLibrary.select.count", {count: selection.size})}
          </AppText>
          <Chip
            label={t("watchLibrary.select.all")}
            onPress={() =>
              setSelection(new Set(sortedDownloads.map(row => row.id)))
            }
          />
          <Chip
            label={t("watchLibrary.select.done")}
            onPress={() => setSelection(null)}
          />
          <AppButton
            disabled={selection.size === 0}
            label={t("watchLibrary.select.delete", {count: selection.size})}
            onPress={confirmSelectionRemoval}
            variant={"danger"}
          />
        </View>
      ) : tab === "downloads" && sortedDownloads.length > 0 ? (
        <View
          style={{
            alignItems: "center",
            flexDirection: "row",
            flexWrap: "wrap",
            gap: theme.spacing.sm,
          }}>
          <Chip
            label={t("watchLibrary.sort.label", {
              mode: t(SORT_LABELS[downloadSort]),
            })}
            onPress={chooseSort}
          />
          <Chip
            label={t("watchLibrary.select.start")}
            onPress={() => setSelection(new Set())}
          />
          <View style={{flexGrow: 1}} />
          {hasDownloads ? (
            <AppButton
              label={t("watchLibrary.action.clearAll")}
              onPress={confirmClearAll}
              variant={"danger"}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );

  const emptyState =
    tab === "transfers" ? (
      <EmptyState
        message={t("watchLibrary.transfers.empty.message")}
        title={t("watchLibrary.transfers.empty.title")}
      />
    ) : !snapshot ? (
      <EmptyState
        actionLabel={t("watchLibrary.refresh")}
        message={t("watchLibrary.noSnapshot.message")}
        onAction={requestSnapshot}
        title={t("watchLibrary.noSnapshot.title")}
      />
    ) : tab === "downloads" ? (
      <EmptyState
        message={t("watchLibrary.downloads.empty.message")}
        title={t("watchLibrary.downloads.empty.title")}
      />
    ) : (
      <EmptyState
        message={t("watchLibrary.playlists.empty.message")}
        title={t("watchLibrary.playlists.empty.title")}
      />
    );

  return (
    <FlatList
      ListEmptyComponent={emptyState}
      ListHeaderComponent={header}
      contentContainerStyle={{
        flexGrow: 1,
        gap: theme.spacing.xs,
        padding: theme.spacing.md,
      }}
      data={rows}
      keyExtractor={rowKey}
      refreshControl={
        <RefreshControl
          onRefresh={requestSnapshot}
          refreshing={waitingForSnapshot && reachable}
          tintColor={theme.colors.textSecondary}
        />
      }
      renderItem={renderItem}
    />
  );
}
