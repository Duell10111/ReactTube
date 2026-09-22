import {useCallback} from "react";
import {FlatList, ListRenderItem} from "react-native";

import {LibrarySectionItem} from "@/components/library/LibrarySectionItem";
import {YTLibrarySection} from "@/extraction/Types";
import useLibrary from "@/hooks/useLibrary";
import {useTranslation} from "@/localization";
import {EmptyState, ErrorState, Skeleton} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

export function LibraryScreen() {
  const {data, loading, error, reload} = useLibrary();
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  const renderItem = useCallback<ListRenderItem<YTLibrarySection>>(({item}) => {
    return <LibrarySectionItem section={item} />;
  }, []);

  const keyExtractor = useCallback((item: YTLibrarySection) => {
    return item.title + item.type;
  }, []);

  return (
    <FlatList
      ListEmptyComponent={
        loading ? (
          <Skeleton
            accessibilityLabel={t("common.loading")}
            height={180}
            style={{margin: theme.spacing.xl}}
          />
        ) : error ? (
          <ErrorState onRetry={reload} />
        ) : (
          <EmptyState />
        )
      }
      contentContainerStyle={{flexGrow: 1}}
      data={data?.sections ?? []}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
    />
  );
}
