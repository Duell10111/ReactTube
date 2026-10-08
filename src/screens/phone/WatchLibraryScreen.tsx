import React, {useCallback, useEffect, useMemo, useState} from "react";
import {
  Alert,
  FlatList,
  ListRenderItem,
  RefreshControl,
  View,
} from "react-native";

import {useWatchLibrary} from "@/context/WatchLibraryContext";
import {
  applyPendingCommands,
  createDownloadVideosArgs,
  formatByteSize,
  getWatchLibraryCommandVideoIds,
  isWatchLibraryCommandStale,
  isWatchLibrarySnapshotOutdated,
  type WatchLibraryCommand,
  type WatchLibraryCommandOp,
  type WatchLibraryDownloadRow,
  type WatchLibraryPendingCommand,
  type WatchLibraryPlaylistRow,
  type WatchLibraryStorageSummary,
} from "@/hooks/watchSync/WatchLibraryProtocol";
import {type TranslationKey, useTranslation} from "@/localization";
import {
  AppButton,
  AppListItem,
  AppText,
  Chip,
  EmptyState,
} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

type Tab = "downloads" | "playlists";

type Row =
  | {kind: "download"; row: WatchLibraryDownloadRow}
  | {kind: "playlist"; row: WatchLibraryPlaylistRow};

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

const PENDING_OP_LABELS: Partial<
  Record<WatchLibraryCommandOp, TranslationKey>
> = {
  downloadVideos: "watchLibrary.pendingOp.downloadVideos",
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
        case "cancelDownloads":
          return t("watchLibrary.command.cancelDownloads", {count});
        case "deleteDownload":
          return t("watchLibrary.command.deleteDownload", {count});
        case "removeVideos":
          return t("watchLibrary.command.removeVideos", {count});
        case "clearAllDownloads":
          return t("watchLibrary.command.clearAllDownloads");
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
  const {t, language} = useTranslation();
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
  } = useWatchLibrary();
  const [tab, setTab] = useState<Tab>("downloads");
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    requestSnapshot();
  }, [requestSnapshot]);

  useEffect(() => {
    // Keeps "no answer since" hints current while the screen stays open.
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const viewModel = useMemo(
    () =>
      snapshot ? applyPendingCommands(snapshot, pendingCommands, status) : null,
    [snapshot, pendingCommands, status],
  );

  const rows = useMemo<Row[]>(() => {
    if (!viewModel) {
      return [];
    }
    return tab === "downloads"
      ? viewModel.downloads.map(row => ({kind: "download", row}))
      : viewModel.playlists.map(row => ({kind: "playlist", row}));
  }, [tab, viewModel]);

  const showDownloadActions = useCallback(
    (row: WatchLibraryDownloadRow) => {
      const title = row.title || t("watchLibrary.untitled");
      const cancel = {text: t("common.cancel"), style: "cancel" as const};
      if (row.state === "downloaded") {
        Alert.alert(title, row.artist, [
          {
            text: t("watchLibrary.action.deleteDownload"),
            style: "destructive",
            onPress: () => sendCommand("deleteDownload", {videoIds: [row.id]}),
          },
          cancel,
        ]);
      } else {
        Alert.alert(title, row.artist, [
          {
            text: t("watchLibrary.action.cancelDownload"),
            style: "destructive",
            onPress: () => sendCommand("cancelDownloads", {videoIds: [row.id]}),
          },
          cancel,
        ]);
      }
    },
    [sendCommand, t],
  );

  const showPlaylistActions = useCallback(
    (row: WatchLibraryPlaylistRow) => {
      const playlist = snapshot?.playlists.find(item => item.id === row.id);
      if (!playlist) {
        return;
      }
      const downloadedIds = new Set(
        snapshot?.videos
          .filter(video => video.downloaded)
          .map(video => video.id) ?? [],
      );
      const missing = playlist.videoIds.filter(id => !downloadedIds.has(id));
      const downloaded = playlist.videoIds.filter(id => downloadedIds.has(id));
      const buttons: Parameters<typeof Alert.alert>[2] = [];
      if (missing.length > 0) {
        buttons.push({
          text: t("watchLibrary.action.downloadPlaylist"),
          onPress: () =>
            sendCommand(
              "downloadVideos",
              createDownloadVideosArgs(missing, snapshot),
            ),
        });
      }
      if (downloaded.length > 0) {
        buttons.push({
          text: t("watchLibrary.action.deletePlaylistDownloads"),
          style: "destructive",
          onPress: () => sendCommand("deleteDownload", {videoIds: downloaded}),
        });
      }
      if (buttons.length === 0) {
        return;
      }
      buttons.push({text: t("common.cancel"), style: "cancel"});
      Alert.alert(row.title || t("watchLibrary.untitled"), undefined, buttons);
    },
    [sendCommand, snapshot, t],
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
      if (item.kind === "playlist") {
        const {row} = item;
        return (
          <AppListItem
            icon={row.autoDownload ? "download-for-offline" : "queue-music"}
            onPress={() => showPlaylistActions(row)}
            subtitle={[
              t("watchLibrary.playlist.summary", {
                count: row.videoCount,
                downloaded: row.downloadedCount,
              }),
              row.autoDownload ? t("watchLibrary.playlist.autoDownload") : "",
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
      return (
        <AppListItem
          icon={
            pendingLabel
              ? "hourglass-empty"
              : row.state === "downloaded"
                ? "download-done"
                : row.state === "downloading"
                  ? "downloading"
                  : "schedule"
          }
          onPress={() => showDownloadActions(row)}
          subtitle={row.artist}
          title={row.title || t("watchLibrary.untitled")}
          trailingText={trailingText}
        />
      );
    },
    [language, showDownloadActions, showPlaylistActions, t],
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
      {viewModel ? (
        <>
          <StorageBar storage={viewModel.storage} />
          <View
            style={{
              alignItems: "center",
              flexDirection: "row",
              gap: theme.spacing.sm,
            }}>
            <Chip
              label={t("watchLibrary.tabs.downloads", {
                count: viewModel.downloads.length,
              })}
              onPress={() => setTab("downloads")}
              selected={tab === "downloads"}
            />
            <Chip
              label={t("watchLibrary.tabs.playlists", {
                count: viewModel.playlists.length,
              })}
              onPress={() => setTab("playlists")}
              selected={tab === "playlists"}
            />
            <View style={{flex: 1}} />
            {tab === "downloads" && hasDownloads ? (
              <AppButton
                label={t("watchLibrary.action.clearAll")}
                onPress={confirmClearAll}
                variant={"danger"}
              />
            ) : null}
          </View>
        </>
      ) : null}
    </View>
  );

  const emptyState = !snapshot ? (
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
      keyExtractor={item => `${item.kind}-${item.row.id}`}
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
