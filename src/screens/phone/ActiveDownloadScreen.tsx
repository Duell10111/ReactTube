import {useCallback, useEffect, useState} from "react";
import {FlatList, ListRenderItem} from "react-native";

import ActiveDownloadListItem from "@/components/downloader/ActiveDownloadListItem";
import {useDownloaderContext} from "@/context/DownloaderContext";
import {DownloadObject} from "@/hooks/downloader/useDownloadProcessor";
import {useTranslation} from "@/localization";
import {EmptyState} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

export function ActiveDownloadScreen() {
  const {currentDownloads} = useDownloaderContext();
  const [activeDownloads, setActiveDownloads] = useState<DownloadObject[]>([]);
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  useEffect(() => {
    setActiveDownloads(Object.values(currentDownloads.current));
    const interval = setInterval(() => {
      setActiveDownloads(Object.values(currentDownloads.current));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const renderItem = useCallback<ListRenderItem<DownloadObject>>(({item}) => {
    return <ActiveDownloadListItem download={item} />;
  }, []);

  return (
    <FlatList
      ListEmptyComponent={
        <EmptyState
          message={t("downloads.active.empty.message")}
          title={t("downloads.active.empty.title")}
        />
      }
      contentContainerStyle={{
        flexGrow: 1,
        gap: theme.spacing.sm,
        padding: theme.spacing.md,
      }}
      data={activeDownloads}
      renderItem={renderItem}
    />
  );
}
