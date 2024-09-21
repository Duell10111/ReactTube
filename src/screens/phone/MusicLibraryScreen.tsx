import React, {useCallback, useEffect} from "react";
import {FlatList, ListRenderItem} from "react-native";

import {HorizontalListItem} from "@/components/music/horizontal/HorizontalListItem";
import {ElementData} from "@/extraction/Types";
import useMusicLibrary from "@/hooks/music/useMusicLibrary";

export function MusicLibraryScreen() {
  const {data, fetchContinuation} = useMusicLibrary();

  useEffect(() => {
    if (data) {
      fetchContinuation();
    }
  }, [data]);

  const renderItem = useCallback<ListRenderItem<ElementData>>(({item}) => {
    return <HorizontalListItem data={item} />;
  }, []);

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      onEndReached={fetchContinuation}
    />
  );
}
