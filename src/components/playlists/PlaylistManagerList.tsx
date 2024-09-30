import React, {useCallback} from "react";
import {FlatList, ListRenderItem, Text} from "react-native";

import {PlaylistManagerListItem} from "@/components/playlists/PlaylistManagerListItem";
import {ElementData} from "@/extraction/Types";

interface PlaylistManagerListProps {
  data: ElementData[];
  onPress?: (data: ElementData) => void;
}

export function PlaylistManagerList({data, onPress}: PlaylistManagerListProps) {
  const renderItem = useCallback<ListRenderItem<ElementData>>(({item}) => {
    return (
      <PlaylistManagerListItem data={item} onPress={() => onPress(item)} />
    );
  }, []);

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      ListHeaderComponent={
        <Text style={{color: "white"}}>{"All Playlists"}</Text>
      }
    />
  );
}
