import React, {useCallback, useEffect} from "react";
import {FlatList, ListRenderItem, View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {MusicBottomPlayerBar} from "@/components/music/MusicBottomPlayerBar";
import {MusicLibraryListItem} from "@/components/music/MusicLibraryListItem";
import {ElementData} from "@/extraction/Types";
import useMusicLibrary from "@/hooks/music/useMusicLibrary";

export function MusicLibraryScreen() {
  const {data, fetchContinuation} = useMusicLibrary();

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
        data={data}
        renderItem={renderItem}
        onEndReached={fetchContinuation}
      />
      <MusicBottomPlayerBar />
    </View>
  );
}
