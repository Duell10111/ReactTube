import {useCallback} from "react";
import {FlatList, ListRenderItem} from "react-native";

import ActiveUploadListItem from "@/components/downloader/ActiveUploadListItem";
import {
  useDownloaderContext,
  WatchFileTransferInfo,
} from "@/context/DownloaderContext";
import {useTranslation} from "@/localization";
import {EmptyState} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

export function ActiveUploadScreen() {
  const {currentUploads} = useDownloaderContext();
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  const renderItem = useCallback<ListRenderItem<WatchFileTransferInfo>>(
    ({item}) => {
      return <ActiveUploadListItem upload={item} />;
    },
    [],
  );

  return (
    <FlatList
      ListEmptyComponent={
        <EmptyState
          message={t("uploads.active.empty.message")}
          title={t("uploads.active.empty.title")}
        />
      }
      contentContainerStyle={{
        flexGrow: 1,
        gap: theme.spacing.sm,
        padding: theme.spacing.md,
      }}
      data={currentUploads}
      renderItem={renderItem}
    />
  );
}
