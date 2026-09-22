import React, {useCallback} from "react";
import {FlatList, ListRenderItem} from "react-native";

import {PlaylistManagerListItem} from "@/components/playlists/PlaylistManagerListItem";
import {ElementData} from "@/extraction/Types";
import {useTranslation} from "@/localization";
import {AppText} from "@/ui/components";

interface PlaylistManagerListProps {
  data: ElementData[];
  onPress?: (data: ElementData) => void;
}

export function PlaylistManagerList({data, onPress}: PlaylistManagerListProps) {
  const {t} = useTranslation();
  const renderItem = useCallback<ListRenderItem<ElementData>>(({item}) => {
    return (
      <PlaylistManagerListItem data={item} onPress={() => onPress?.(item)} />
    );
  }, []);

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      ListHeaderComponent={
        <AppText variant={"titleSmall"}>{t("playlist.manager.all")}</AppText>
      }
      style={{marginBottom: 100}}
    />
  );
}
