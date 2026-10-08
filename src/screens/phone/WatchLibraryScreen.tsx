import React, {useCallback, useEffect, useMemo, useState} from "react";
import {FlatList, ListRenderItem, RefreshControl, View} from "react-native";

import {useWatchLibrary} from "@/context/WatchLibraryContext";
import {
  buildWatchLibraryViewModel,
  formatByteSize,
  isWatchLibrarySnapshotOutdated,
  type WatchLibraryDownloadRow,
  type WatchLibraryPlaylistRow,
  type WatchLibraryStorageSummary,
} from "@/hooks/watchSync/WatchLibraryProtocol";
import {useTranslation} from "@/localization";
import {AppListItem, AppText, Chip, EmptyState} from "@/ui/components";
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

/** Read-only view of the library stored on the paired Apple Watch. */
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
  } = useWatchLibrary();
  const [tab, setTab] = useState<Tab>("downloads");

  useEffect(() => {
    requestSnapshot();
  }, [requestSnapshot]);

  const viewModel = useMemo(
    () => (snapshot ? buildWatchLibraryViewModel(snapshot, status) : null),
    [snapshot, status],
  );

  const rows = useMemo<Row[]>(() => {
    if (!viewModel) {
      return [];
    }
    return tab === "downloads"
      ? viewModel.downloads.map(row => ({kind: "download", row}))
      : viewModel.playlists.map(row => ({kind: "playlist", row}));
  }, [tab, viewModel]);

  const renderItem = useCallback<ListRenderItem<Row>>(
    ({item}) => {
      if (item.kind === "playlist") {
        const {row} = item;
        return (
          <AppListItem
            icon={row.autoDownload ? "download-for-offline" : "queue-music"}
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
      const trailingText =
        row.state === "downloading"
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
            row.state === "downloaded"
              ? "download-done"
              : row.state === "downloading"
                ? "downloading"
                : "schedule"
          }
          subtitle={row.artist}
          title={row.title || t("watchLibrary.untitled")}
          trailingText={trailingText}
        />
      );
    },
    [language, t],
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
      {viewModel ? (
        <>
          <StorageBar storage={viewModel.storage} />
          <View style={{flexDirection: "row", gap: theme.spacing.sm}}>
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
