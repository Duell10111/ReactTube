import React, {useCallback, useEffect} from "react";
import {FlatList, ListRenderItem, View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {MusicBottomPlayerBar} from "@/components/music/MusicBottomPlayerBar";
import {MusicLibraryListItem} from "@/components/music/MusicLibraryListItem";
import {ElementData} from "@/extraction/Types";
import useMusicLibrary from "@/hooks/music/useMusicLibrary";
import {useTranslation} from "@/localization";
import {EmptyState} from "@/ui/components";
import {useAppTheme} from "@/ui/theme";

export function MusicLibraryScreen() {
  const {data, fetchContinuation} = useMusicLibrary();
  const {t} = useTranslation();
  const {theme} = useAppTheme();

  const {bottom, left, right} = useSafeAreaInsets();

  useEffect(() => {
    if (data) {
      fetchContinuation();
    }
  }, [data]);

  const renderItem = useCallback<ListRenderItem<ElementData>>(({item}) => {
    return <MusicLibraryListItem data={item} />;
  }, []);

  return (
    <View
      style={{
        flex: 1,
        paddingBottom: bottom,
        paddingLeft: left,
        paddingRight: right,
      }}>
      <FlatList
        ListEmptyComponent={
          <EmptyState
            message={t("music.library.empty.message")}
            title={t("music.library.empty.title")}
          />
        }
        contentContainerStyle={{
          flexGrow: 1,
          gap: theme.spacing.xs,
          padding: theme.spacing.md,
        }}
        data={data}
        renderItem={renderItem}
        onEndReached={fetchContinuation}
      />
      <MusicBottomPlayerBar />
    </View>
  );
}
